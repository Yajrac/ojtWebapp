(() => {
  'use strict';
  const trigger = document.querySelector('.add-photo-btn.camera');
  const input = trigger.querySelector('input');
  const modal = document.getElementById('report-camera');
  const video = modal.querySelector('video');
  const status = modal.querySelector('[role="status"]');
  const capture = modal.querySelector('[data-take-photo]');
  const preview = modal.querySelector('.camera-captured-preview');
  const retake = modal.querySelector('[data-retake-photo]');
  const usePhoto = modal.querySelector('[data-use-photo]');
  let pendingPhoto, previewUrl;
  function resetCapture() {
    pendingPhoto = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    preview.removeAttribute('src');
    preview.hidden = true;
    video.hidden = false;
    retake.hidden = usePhoto.hidden = true;
    capture.hidden = false;
  }
  let stream;
  let opening = 0;
  function stop() {
    opening++;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    capture.disabled = true;
    resetCapture();
  }
  modal.addEventListener('close', stop);
  modal.querySelector('[data-close-camera]').addEventListener('click', () => { stop(); modal.close(); });
  trigger.addEventListener('click', async event => {
    event.preventDefault();
    if (input.disabled) return;
    if (modal.open) return;
    modal.showModal();
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      status.textContent = 'Open this app on localhost or HTTPS to use the camera.';
      return;
    }
    status.textContent = 'Allow camera access to take a photo.';
    capture.disabled = true;
    const request = ++opening;
    try {
      const mobile = navigator.maxTouchPoints > 0 && /Android|iPhone|iPad/i.test(navigator.userAgent);
      const camera = await navigator.mediaDevices.getUserMedia({ video: mobile ? { facingMode: { ideal: 'environment' } } : true, audio: false });
      if (!modal.open || request !== opening) { camera.getTracks().forEach(track => track.stop()); return; }
      stream = camera;
      video.srcObject = stream;
      await video.play();
      if (!modal.open || request !== opening) return;
      capture.disabled = false;
      status.textContent = '';
    } catch (error) {
      if (!modal.open || request !== opening) return;
      stop();
      const messages = {
        NotAllowedError: 'Camera permission was blocked. Allow camera access in the browser site settings, then close and reopen Camera.',
        NotFoundError: 'No camera detected. Connect or enable a camera and try again.',
        NotReadableError: 'The webcam is busy or unavailable. Close other camera apps and try again.'
      };
      status.textContent = messages[error.name] || 'Unable to start the camera. Close this dialog and try again.';
    }
  });
  capture.addEventListener('click', async () => {
    if (!video.videoWidth || !video.videoHeight) return;
    capture.disabled = true;
    const request = opening;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) throw new Error('No photo');
      if (!modal.open || request !== opening) return;
      pendingPhoto = blob;
      preview.src = previewUrl = URL.createObjectURL(blob);
      preview.hidden = false;
      video.pause();
      video.hidden = true;
      capture.hidden = true;
      retake.hidden = usePhoto.hidden = false;
      status.textContent = 'Use this photo for your report, or retake it?';
      usePhoto.focus();
    } catch {
      status.textContent = 'Unable to capture the photo. Please try again.';
      capture.disabled = false;
    }
  });
  retake.addEventListener('click', async () => {
    resetCapture();
    try { await video.play(); capture.disabled = false; status.textContent = ''; }
    catch { status.textContent = 'Unable to resume camera. Close and reopen Camera.'; }
  });
  usePhoto.addEventListener('click', () => {
    if (!pendingPhoto) return;
    try {
      const transfer = new DataTransfer();
      transfer.items.add(new File([pendingPhoto], `report-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      stop();
      modal.close();
    } catch {
      status.textContent = 'Unable to add the photo. Please try again.';
    }
  });
  window.addEventListener('pagehide', stop);
})();
