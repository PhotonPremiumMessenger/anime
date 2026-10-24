/* ============================================================
   certificate.js — сертификат картинкой
   Рисует PNG на canvas: ник, уровень, опыт, достижения и дата.
   Никаких библиотек — только canvas и Blob, поэтому работает офлайн.
   ============================================================ */

'use strict';

/** Имя для сертификата. */
function certificateName() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  return user && user.username ? user.username : 'Гость Nihongo';
}

/**
 * Рисует сертификат и возвращает canvas.
 * @param {HTMLCanvasElement} canvas
 */
function drawCertificate(canvas) {
  const width = 1200;
  const height = 850;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  const level = typeof getLevelInfo === 'function' ? getLevelInfo(typeof getXP === 'function' ? getXP() : 0) : { level: 1 };
  const achievements = typeof getUnlockedAchievements === 'function' ? getUnlockedAchievements().length : 0;
  const xp = typeof getXP === 'function' ? getXP() : 0;

  // Фон
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#101018');
  bg.addColorStop(0.55, '#16121d');
  bg.addColorStop(1, '#0c0c12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Тёплое свечение сверху
  const glow = ctx.createRadialGradient(width / 2, 80, 40, width / 2, 80, 620);
  glow.addColorStop(0, 'rgba(255, 149, 0, 0.35)');
  glow.addColorStop(1, 'rgba(255, 149, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Рамка
  ctx.strokeStyle = 'rgba(255, 181, 71, 0.75)';
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 38, width - 76, height - 76);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, 56, width - 112, height - 112);

  // Уголки
  ctx.strokeStyle = 'rgba(255, 181, 71, 0.9)';
  ctx.lineWidth = 5;
  [[38, 38, 1, 1], [width - 38, 38, -1, 1], [38, height - 38, 1, -1], [width - 38, height - 38, -1, -1]]
    .forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * 70, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * 70);
      ctx.stroke();
    });

  // Заголовок
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb547';
  ctx.font = '600 30px "Russo One", "Noto Sans JP", sans-serif';
  ctx.fillText('NIHONGO · 日本語', width / 2, 150);

  ctx.fillStyle = '#f4f4f7';
  ctx.font = '600 22px "Noto Sans JP", sans-serif';
  ctx.fillText('СЕРТИФИКАТ ОБ УЧЁБЕ', width / 2, 200);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 130, 226);
  ctx.lineTo(width / 2 + 130, 226);
  ctx.stroke();

  // Имя
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 62px "Russo One", "Noto Sans JP", sans-serif';
  ctx.fillText(certificateName(), width / 2, 340);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '400 24px "Noto Sans JP", sans-serif';
  ctx.fillText('дошёл(ла) до уровня', width / 2, 392);

  // Уровень
  ctx.fillStyle = '#ffb547';
  ctx.font = '700 96px "Russo One", "Noto Sans JP", sans-serif';
  ctx.fillText(String(level.level), width / 2, 500);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '400 24px "Noto Sans JP", sans-serif';
  ctx.fillText('уровень · ' + xp + ' XP · достижений: ' + achievements, width / 2, 546);

  // Линия и дата
  const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '400 20px "Noto Sans JP", sans-serif';
  ctx.fillText(date, width / 2, 720);
  ctx.fillText('photonpremiummessenger.github.io/anime', width / 2, 754);

  // Печать
  ctx.beginPath();
  ctx.arc(width - 190, height - 190, 62, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 181, 71, 0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 181, 71, 0.8)';
  ctx.font = '700 34px "Noto Sans JP", sans-serif';
  ctx.fillText('語', width - 190, height - 178);

  return canvas;
}

/** Скачивает сертификат. */
function downloadCertificate() {
  const canvas = document.createElement('canvas');
  drawCertificate(canvas);

  canvas.toBlob(blob => {
    if (!blob) {
      if (typeof showToast === 'function') showToast('Не получилось', 'Браузер не отдал картинку', 'error');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nihongo-certificate-' + certificateName().replace(/[^\wа-яА-Я-]+/g, '-') + '.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    if (typeof showToast === 'function') {
      showToast('Сертификат готов', 'PNG сохранён в загрузки', 'success');
    }
  }, 'image/png');
}

/** Показывает превью сертификата в модалке. */
function previewCertificate() {
  const modal = document.getElementById('certificateModal');
  const holder = document.getElementById('certificatePreview');
  if (!modal || !holder) return;

  holder.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'certificate-canvas';
  drawCertificate(canvas);
  holder.appendChild(canvas);

  modal.classList.add('open');
  document.body.classList.add('modal-open');
}

/** Закрывает превью. */
function closeCertificate() {
  const modal = document.getElementById('certificateModal');
  if (modal) modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

/* Экспорт в глобальную область */
window.drawCertificate = drawCertificate;
window.downloadCertificate = downloadCertificate;
window.previewCertificate = previewCertificate;
window.closeCertificate = closeCertificate;
window.certificateName = certificateName;
