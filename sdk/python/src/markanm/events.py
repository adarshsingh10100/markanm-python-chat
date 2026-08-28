class Event:
    def __init__(self, data):
        self.event_id = data.get("event_id")
        self.event_type = data.get("event_type")
        self.payload = data.get("payload", {})
        self.created_at = data.get("created_at")
