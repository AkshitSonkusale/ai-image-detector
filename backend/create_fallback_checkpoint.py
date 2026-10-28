"""
Create a fallback checkpoint: ImageNet EfficientNet-B0 backbone + random binary head.
Run once so the backend can start without a fully-trained model.

  python create_fallback_checkpoint.py
"""
from pathlib import Path
import torch
import torch.nn as nn
from torchvision import models

OUT = Path(__file__).resolve().parent.parent / "models" / "effnet_b0_best.pt"
OUT.parent.mkdir(parents=True, exist_ok=True)
if OUT.exists():
    raise SystemExit(f"{OUT} already exists — refusing to overwrite your trained model.")

print("Building EfficientNet-B0 with ImageNet weights …")
backbone = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

model = models.efficientnet_b0(weights=None)
model.classifier = nn.Sequential(
    nn.Dropout(p=0.2, inplace=True),
    nn.Linear(1280, 1),
)
model.features.load_state_dict(backbone.features.state_dict())
# classifier stays randomly initialised

torch.save({"model_state_dict": model.state_dict()}, OUT)
print(f"Saved fallback checkpoint → {OUT}")
print("Replace with a properly fine-tuned model after running notebook 03.")
