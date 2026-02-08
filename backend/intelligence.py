import utils

def analyze_coverage_data(points):
    """
    Analyzes a list of Wi-Fi data points to generate insights, 
    recommendations, and heatmap data.
    """
    if not points:
        return None

    # 1. Calculate Statistics
    # Point format: {'x': 100, 'y': 200, 'signal': -55, 'name': 'Kitchen'}
    best_pt = max(points, key=lambda p: int(p['signal']))
    worst_pt = min(points, key=lambda p: int(p['signal']))
    
    avg_signal = sum(int(p['signal']) for p in points) / len(points)

    # 2. Generate Real Insights (HTML)
    analysis_html = f"""
    <strong>Coverage Insight</strong><br>
    <ul>
        <li><strong>Best Zone:</strong> {best_pt.get('name', 'Unknown')} ({best_pt['signal']} dBm)</li>
        <li><strong>Weakest Zone:</strong> {worst_pt.get('name', 'Unknown')} ({worst_pt['signal']} dBm)</li>
        <li><strong>Average Signal:</strong> {avg_signal:.1f} dBm</li>
    </ul>
    """
    
    recommendation_html = ""
    if worst_pt['signal'] < -75:
        recommendation_html = f"<br><strong>Recommendation:</strong><br>Weak coverage detected in <strong>{worst_pt.get('name')}</strong>. Consider placing a Wi-Fi extender near {best_pt.get('name')} facing towards it."
    else:
        recommendation_html = "<br><strong>Recommendation:</strong><br>Excellent coverage throughout the mapped area. No hardware changes needed."

    final_message = analysis_html + recommendation_html

    # 3. Generate Heatmap Data
    # Format: [x, y, normalized_intensity (0.0 to 1.0)]
    heatmap_data = []
    for p in points:
        sig = int(p['signal'])
        intensity = utils.normalize_signal_intensity(sig)
        heatmap_data.append([p['x'], p['y'], intensity])

    return {
        "heatmap_data": heatmap_data,
        "recommendation": final_message
    }