# AI Image Detector

**Detection of AI-Generated Images Using Transfer Learning and Grad-CAM**

A deep learning mini-project that classifies images as **REAL** or **AI-GENERATED**, returns a confidence score, and produces a **Grad-CAM heatmap** explaining the decision.

```
Image → Preprocess (224×224, ImageNet norm) → EfficientNet-B0 (fine-tuned) → Sigmoid → REAL / AI-GENERATED
                                                    └→ Grad-CAM on last conv block → heatmap overlay
```

## Features

- **Baseline CNN** trained from scratch (32×32)
- **EfficientNet-B0** transfer learning (freeze → fine-tune last blocks)
- **Grad-CAM** explainability heatmaps
- **Cross-generator evaluation** (limitation analysis)
- Clean **FastAPI** backend + **React** frontend
- Dark "forensics lab" UI

## Quick Start

### 1. Training (Google Colab, T4 GPU)

Upload the notebooks to Colab and run them in order. The first cell of each one mounts Google Drive and
downloads CIFAKE with `kagglehub`. Everything is saved to `MyDrive/ai-image-detector/` (`models/`, `report/`, `examples/`).

1. `01_eda.ipynb` – class counts, sample grid
2. `02_baseline_cnn.ipynb` – from-scratch CNN → `baseline_cnn_best.pt`
3. `03_efficientnet_transfer.ipynb` – transfer learning → `effnet_b0_best.pt`
4. `04_gradcam_and_eval.ipynb` – Grad-CAM grids, metrics table, side-by-side confusion matrices,
   cross-generator test (optional `cross_gen/REAL` + `cross_gen/FAKE` folders on Drive), exports example images

Then copy from Drive:
- `models/effnet_b0_best.pt` → `models/` in this repo
- `examples/*.jpg` → `frontend/public/examples/`
- `report/*` → `report/`

### 2. Backend (local)

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The checkpoint is looked up in `$MODEL_PATH`, `backend/models/`, then `models/`.
Uploads are first reduced to a 32×32 JPEG (the CIFAKE format) before inference. Set `MATCH_TRAINING_RES=0` to turn this off.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 4. Deploy

**Backend → Hugging Face Spaces**
1. Create a new Space → SDK: **Docker** (blank template).
2. Clone it, then copy in everything from `backend/` plus `models/effnet_b0_best.pt` (keep it at `models/effnet_b0_best.pt`).
3. `git lfs track "*.pt"`, then commit and push. The first build takes ~5 min.
4. Test: `https://<user>-<space>.hf.space/health`

**Frontend → Vercel**
1. Import the repo and set the root directory to `frontend`.
2. Add the env var `VITE_API_URL=https://<user>-<space>.hf.space`, then deploy.

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | Multipart image → label, confidence, heatmap |
| `/health` | GET | Status + model name |

## Project Structure

```
ai-image-detector/
├── notebooks/          # Training & evaluation
├── models/             # Checkpoints (.pt)
├── backend/            # FastAPI + Grad-CAM
├── frontend/           # React + Vite + Tailwind
├── report/             # Figures, slides
└── README.md
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Training | PyTorch, torchvision, Colab T4 |
| XAI | pytorch-grad-cam |
| Backend | FastAPI + Uvicorn |
| Frontend | React + Vite + Tailwind |
| Deploy | HF Spaces (Docker) + Vercel |

## Important Notes

- Model is trained on CIFAKE (CIFAR-10 real + Stable Diffusion v1.4 fake, 32×32 upscaled to 224).
- Performance drops on unseen generators (Midjourney, Flux, DALL·E) — this is intentional for the limitations analysis.
- Light augmentation only (horizontal flip) so generation artifacts are preserved.
- Do not claim "deepfake detection"; this is AI-generated *image* detection.

## License

MIT
