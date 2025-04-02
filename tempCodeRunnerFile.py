def calculate_angle(a, b, c):
    # Calculate the angle at point b given points a, b, and c
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot_product = ba[0] * bc[0] + ba[1] * bc[1]
    magnitude_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    magnitude_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if magnitude_ba * magnitude_bc == 0:
        return 0  
    cosine_angle = dot_product / (magnitude_ba * magnitude_bc)
    return math.degrees(math.acos(max(-1, min(1, cosine_angle))))


def calculate_similarity(landmarks1, landmarks2):
    if landmarks1 is None or landmarks2 is None:
        return 0.0
        
    if len(landmarks1) != len(landmarks2):
        raise ValueError("Landmark lists must have the same length")

    # Define important joint angles to compare
    # Each tuple contains three landmark indices (a, b, c) where b is the vertex
    important_angles = [
        # Right arm angle (shoulder, elbow, wrist)
        (11, 13, 15),
        # Left arm angle (shoulder, elbow, wrist)
        (12, 14, 16),
        # Right leg angle (hip, knee, ankle)
        (23, 25, 27),
        # Left leg angle (hip, knee, ankle)
        (24, 26, 28),
        # Torso right side (shoulder, hip, knee)
        (11, 23, 25),
        # Torso left side (shoulder, hip, knee)
        (12, 24, 26)
    ]
    
    # Calculate position difference
    position_diffs = []
    for i in range(len(landmarks1)):
        # Only consider landmarks we can see
        if landmarks1[i][3] > 0.5 and landmarks2[i][3] > 0.5:
            x1, y1, z1, _ = landmarks1[i]
            x2, y2, z2, _ = landmarks2[i]
            distance = ((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)**0.5
            position_diffs.append(distance)
    
    # Calc angle differences
    angle_diffs = []
    for a_idx, b_idx, c_idx in important_angles:
        # Check if landmarks are available and visible
        if (landmarks1[a_idx][3] > 0.5 and landmarks1[b_idx][3] > 0.5 and landmarks1[c_idx][3] > 0.5 and
            landmarks2[a_idx][3] > 0.5 and landmarks2[b_idx][3] > 0.5 and landmarks2[c_idx][3] > 0.5):
            
            # Get coordinates for first set
            a1 = (landmarks1[a_idx][0], landmarks1[a_idx][1])
            b1 = (landmarks1[b_idx][0], landmarks1[b_idx][1])
            c1 = (landmarks1[c_idx][0], landmarks1[c_idx][1])
            
            # Get coordinates for second set
            a2 = (landmarks2[a_idx][0], landmarks2[a_idx][1])
            b2 = (landmarks2[b_idx][0], landmarks2[b_idx][1])
            c2 = (landmarks2[c_idx][0], landmarks2[c_idx][1])
            
            # Calculate angles
            angle1 = calculate_angle(a1, b1, c1)
            angle2 = calculate_angle(a2, b2, c2)
            
            # Calculate updated --> using cos
            angle_diff = math.cos(angle1 - angle2)
            # if that doent work try this angle_diff = min(abs(angle1 - angle2), 360 - abs(angle1 - angle2))

            angle_diffs.append(angle_diff)
    
    # Combine position and angle metrics
    if position_diffs and angle_diffs:
        avg_position_diff = sum(position_diffs) / len(position_diffs)
        avg_angle_diff = sum(angle_diffs) / len(angle_diffs)
        
        # Non-linear transformation for position similarity
        # Gaussian function to create a bell curve effect
        position_similarity = np.exp(-2 * avg_position_diff**2)
        
        # Non-linear transformation for angle similarity
        # Sigmoid-like behavior here too. 
        normalized_angle_diff = avg_angle_diff / 180.0
        angle_similarity = 1 / (1 + np.exp(10 * (normalized_angle_diff - 0.3)))
        
        # Weight the two scores (angle is more important for motion comparison)
        final_similarity = 0.5 * position_similarity + 0.5 * angle_similarity
        
        # Debugzzz
        print(f"Position similarity: {position_similarity:.4f}")
        print(f"Angle similarity: {angle_similarity:.4f}")
        print(f"Final similarity score: {final_similarity:.4f}")
        
        return final_similarity
    return 0.0  # Return zero if no valid measurements
