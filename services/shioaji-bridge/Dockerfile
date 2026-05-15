FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY services/shioaji-bridge/requirements.txt /app/services/shioaji-bridge/requirements.txt
RUN pip install --no-cache-dir -r /app/services/shioaji-bridge/requirements.txt

COPY services/shioaji-bridge/bridge.py /app/services/shioaji-bridge/bridge.py

CMD ["python", "services/shioaji-bridge/bridge.py"]
