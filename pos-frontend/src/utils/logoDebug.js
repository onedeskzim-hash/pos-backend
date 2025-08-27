// Logo debugging utility
export const debugLogo = async (businessProfile, MEDIA_BASE_URL) => {
  if (!businessProfile?.logo) {
    console.log('❌ No logo found in business profile');
    return false;
  }

  const logoUrl = businessProfile.logo;
  console.log('🔍 Logo debugging info:');
  console.log('  - Business profile logo path:', businessProfile.logo);
  console.log('  - Full logo URL:', logoUrl);
  console.log('  - Media base URL:', MEDIA_BASE_URL);

  try {
    const response = await fetch(logoUrl);
    console.log('  - Fetch response status:', response.status);
    console.log('  - Fetch response ok:', response.ok);
    console.log('  - Content type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('  - Blob size:', blob.size, 'bytes');
      console.log('  - Blob type:', blob.type);
      console.log('✅ Logo loaded successfully');
      return true;
    } else {
      console.log('❌ Logo fetch failed with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Logo fetch error:', error.message);
    return false;
  }
};