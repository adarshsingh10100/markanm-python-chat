from markanm.events import Event

def test_event_properties():
    raw_data = {
        "event_id": "evt_12345",
        "event_type": "message.created",
        "timestamp": 1788000000,
        "payload": {"text": "hello"}
    }
    evt = Event(raw_data)
    assert evt.id == "evt_12345"
    assert evt.event_id == "evt_12345"
    assert evt.type == "message.created"
    assert evt.event_type == "message.created"
    assert evt.payload == {"text": "hello"}
    assert repr(evt) == "<MarkanM Event type='message.created' id='evt_12345'>"
