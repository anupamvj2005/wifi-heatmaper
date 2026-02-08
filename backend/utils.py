import random

def generate_fake_signal():
    """Generates a random signal strength for simulation."""
    return random.randint(-65, -40)

def get_status_from_signal(signal):
    """Determines online/offline status based on signal strength."""
    return 'online' if signal > -90 else 'offline'

def normalize_signal_intensity(signal):
    """
    Normalizes signal strength to an intensity between 0.0 and 1.0.
    Mapping: -90dBm -> 0.0, -30dBm -> 1.0
    """
    return max(0, min(1, (signal + 90) / 60))