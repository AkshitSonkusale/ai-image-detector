# Hugging Face Spaces – Docker SDK
# Space repo layout (push the contents of backend/ plus the checkpoint):
#   Dockerfile, README.md, app.py, model.py, requirements.txt
#   models/effnet_b0_best.pt

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces runs containers as user 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/app

# CPU-only PyTorch (the default PyPI wheel pulls ~3 GB of CUDA libraries)
RUN pip install --no-cache-dir --user torch torchvision --index-url https://download.pytorch.org/whl/cpu
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

# Crash on startup instead of silently serving an untrained head
ENV REQUIRE_CHECKPOINT=1

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
