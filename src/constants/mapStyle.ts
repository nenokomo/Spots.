/** Dark Google map style shared by the radar and map previews (Android; iOS uses mutedStandard + dark). */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#202023' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b90' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202023' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#363639' }] },
  { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111113' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#242426' }] },
];
