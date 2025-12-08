from celery import shared_task
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["livequiz"]

@shared_task(name="celery.tasks.save_result_task")
def save_result_task(data):
    db.results.insert_one({
        "studentName": data["studentName"],
        "score": data["score"],
        "total": data["total"]
    })
    return "Saved"
