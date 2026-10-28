"""
Model loading, inference and Grad-CAM for AI-generated image detection.

Architecture matches the project spec:
  torchvision EfficientNet-B0 → Linear(1280, 1) binary head
  Grad-CAM target: model.features[-1]
"""

from __future__ import annotations

import base64
import io
import os
import time
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import BinaryClassifierOutputTarget
from torchvision import models, transforms

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
INPUT_SIZE = 224
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# CIFAKE images are 32x32 JPEGs. At inference we first squash the upload to the
# same format so the model sees what it was trained on (set MATCH_TRAINING_RES=0
# to disable). Without this, high-res real photos are almost always called "AI".
TRAIN_RES = 32
MATCH_TRAINING_RES = os.getenv("MATCH_TRAINING_RES", "1") == "1"

# Checkpoint search order: $MODEL_PATH → backend/models/ → <project root>/models/
_BACKEND_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _BACKEND_DIR.parent
_CKPT_CANDIDATES = [
    Path(os.environ["MODEL_PATH"]) if os.getenv("MODEL_PATH") else None,
    _BACKEND_DIR / "models" / "effnet_b0_best.pt",
    _PROJECT_ROOT / "models" / "effnet_b0_best.pt",
]
# In deployment we never want to silently serve a random head
REQUIRE_CHECKPOINT = os.getenv("REQUIRE_CHECKPOINT", "0") == "1"


def _find_checkpoint() -> Path | None:
    for c in _CKPT_CANDIDATES:
        if c is not None and c.is_file():
            return c
    return None


# ---------------------------------------------------------------------------
# Model definition
# ---------------------------------------------------------------------------
def build_efficientnet_b0(num_classes: int = 1) -> nn.Module:
    """Build EfficientNet-B0 with a single-logit binary head."""
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features  # 1280
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def load_model(checkpoint_path: Path | str | None = None) -> nn.Module:
    """
    Load the fine-tuned EfficientNet-B0.

    Priority:
      1. Explicit checkpoint_path
      2. $MODEL_PATH, backend/models/, then <project root>/models/
      3. Fallback: ImageNet backbone + randomly initialised head
         (useful for pipeline testing before training finishes)
    """
    model = build_efficientnet_b0(num_classes=1)

    ckpt = Path(checkpoint_path) if checkpoint_path else _find_checkpoint()

    if ckpt is not None and ckpt.is_file():
        state = torch.load(ckpt, map_location="cpu", weights_only=True)
        # Support both raw state_dict and {"model_state_dict": ...} wrappers
        if isinstance(state, dict) and "model_state_dict" in state:
            state = state["model_state_dict"]
        model.load_state_dict(state, strict=True)
        print(f"[model] Loaded checkpoint from {ckpt}")
    elif REQUIRE_CHECKPOINT:
        raise FileNotFoundError(
            "effnet_b0_best.pt not found (looked in: "
            + ", ".join(str(c) for c in _CKPT_CANDIDATES if c) + ")"
        )
    else:
        # Fallback: ImageNet weights so Grad-CAM still produces meaningful maps
        print("[model] Checkpoint not found — loading ImageNet weights + random head")
        backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
        model.features.load_state_dict(backbone.features.state_dict())
        # classifier stays random

    model.to(DEVICE)
    model.eval()
    return model


# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------
_transform = transforms.Compose(
    [
        transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ]
)


def match_training_format(image: Image.Image) -> Image.Image:
    """Downscale to 32x32 and JPEG-compress, like CIFAKE training images."""
    small = image.convert("RGB").resize((TRAIN_RES, TRAIN_RES), Image.BICUBIC)
    buf = io.BytesIO()
    small.save(buf, format="JPEG", quality=75)
    buf.seek(0)
    return Image.open(buf).convert("RGB")


def preprocess(image: Image.Image) -> torch.Tensor:
    """PIL Image → batched tensor [1, 3, 224, 224] on DEVICE."""
    if image.mode != "RGB":
        image = image.convert("RGB")
    tensor = _transform(image).unsqueeze(0)
    return tensor.to(DEVICE)


# ---------------------------------------------------------------------------
# Inference + Grad-CAM
# ---------------------------------------------------------------------------
class AIImageDetector:
    """Thin wrapper that owns the model and the Grad-CAM extractor."""

    def __init__(self, checkpoint_path: Path | str | None = None):
        self.model = load_model(checkpoint_path)
        # Last convolutional block of EfficientNet-B0
        self.target_layers = [self.model.features[-1]]
        self.cam = GradCAM(model=self.model, target_layers=self.target_layers)

    @torch.inference_mode()
    def _forward(self, tensor: torch.Tensor) -> float:
        """Return sigmoid probability of the positive class (AI-GENERATED)."""
        logit = self.model(tensor).squeeze()
        return torch.sigmoid(logit).item()

    def predict(self, image: Image.Image) -> dict[str, Any]:
        """
        Full prediction pipeline.

        Returns a dict matching the API contract:
          label, confidence, probabilities, heatmap (base64), original (base64), inference_ms
        """
        t0 = time.perf_counter()

        # Keep a copy for overlay
        original_rgb = np.array(image.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE)))
        original_float = original_rgb.astype(np.float32) / 255.0

        model_input = match_training_format(image) if MATCH_TRAINING_RES else image
        tensor = preprocess(model_input)

        # --- classification ---
        # We need gradients for Grad-CAM, so temporarily enable them
        tensor.requires_grad_(True)
        self.model.zero_grad()

        logit = self.model(tensor).squeeze()
        prob_ai = torch.sigmoid(logit).item()
        prob_real = 1.0 - prob_ai

        # Binary decision: AI if prob_ai >= 0.5
        is_ai = prob_ai >= 0.5
        label = "AI-GENERATED" if is_ai else "REAL"
        confidence = prob_ai if is_ai else prob_real

        # --- Grad-CAM ---
        # Target the predicted class (1 = AI, 0 = REAL)
        target = BinaryClassifierOutputTarget(1 if is_ai else 0)
        grayscale_cam = self.cam(input_tensor=tensor, targets=[target])
        grayscale_cam = grayscale_cam[0]  # (H, W)

        # Pure colour heatmap (image_weight=0). The frontend layers it over the
        # original with an opacity slider, so we must not pre-blend it here.
        cam_image = show_cam_on_image(original_float, grayscale_cam, use_rgb=True, image_weight=0.0)
        cam_pil = Image.fromarray(cam_image)

        # Encode both images as base64 PNG
        heatmap_b64 = _pil_to_base64(cam_pil)
        original_b64 = _pil_to_base64(Image.fromarray(original_rgb))

        elapsed_ms = (time.perf_counter() - t0) * 1000

        return {
            "label": label,
            "confidence": round(confidence, 4),
            "probabilities": {
                "real": round(prob_real, 4),
                "ai_generated": round(prob_ai, 4),
            },
            "heatmap": f"data:image/png;base64,{heatmap_b64}",
            "original": f"data:image/png;base64,{original_b64}",
            "inference_ms": round(elapsed_ms, 1),
        }


def _pil_to_base64(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ---------------------------------------------------------------------------
# Singleton helper (used by FastAPI)
# ---------------------------------------------------------------------------
_detector: AIImageDetector | None = None


def get_detector(checkpoint_path: Path | str | None = None) -> AIImageDetector:
    global _detector
    if _detector is None:
        _detector = AIImageDetector(checkpoint_path)
    return _detector
