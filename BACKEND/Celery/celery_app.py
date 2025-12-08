from celery import Celery

app = Celery(
    "livequiz",
    broker="amqp://guest:guest@localhost:5672//",
    backend="rpc://"
)

# MANUALLY IMPORT TASKS (important!)
import Celery.tasks
