import { useEffect, useRef, useCallback } from 'react';

/**
 * Aurora wave canvas for auth pages.
 * Same technique as the landing page aurora but with a subtler,
 * more focused indigo/purple palette and gentler waves.
 */
const AuthAuroraCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const dark = document.documentElement.classList.contains('dark');

    // Fewer, softer waves — indigo/violet palette
    const waves = [
      {
        color: dark ? 'rgba(129,140,248,' : 'rgba(99,102,241,',
        amp: 80,
        freq: 0.0012,
        speed: 0.0003,
        yOffset: 0.2,
        width: 240,
      },
      {
        color: dark ? 'rgba(167,139,250,' : 'rgba(139,92,246,',
        amp: 70,
        freq: 0.0016,
        speed: -0.00025,
        yOffset: 0.4,
        width: 200,
      },
      {
        color: dark ? 'rgba(196,181,253,' : 'rgba(168,85,247,',
        amp: 60,
        freq: 0.0014,
        speed: 0.00035,
        yOffset: 0.6,
        width: 220,
      },
      {
        color: dark ? 'rgba(165,180,252,' : 'rgba(79,70,229,',
        amp: 90,
        freq: 0.001,
        speed: -0.0002,
        yOffset: 0.8,
        width: 260,
      },
    ];

    let time = 0;

    const render = () => {
      time++;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = dark ? '#030712' : '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      for (const wave of waves) {
        const baseY = h * wave.yOffset;
        const opacity = dark ? 0.1 : 0.07;

        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 3) {
          const y =
            baseY +
            Math.sin(x * wave.freq + time * wave.speed) * wave.amp +
            Math.sin(x * wave.freq * 1.6 + time * wave.speed * 0.6) * (wave.amp * 0.35) +
            Math.sin(x * wave.freq * 0.4 + time * wave.speed * 1.2) * (wave.amp * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - wave.amp * 1.5, 0, baseY + wave.width);
        grad.addColorStop(0, wave.color + '0)');
        grad.addColorStop(0.3, wave.color + opacity * 1.4 + ')');
        grad.addColorStop(0.6, wave.color + opacity + ')');
        grad.addColorStop(1, wave.color + '0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Subtle edge line
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const y =
            baseY +
            Math.sin(x * wave.freq + time * wave.speed) * wave.amp +
            Math.sin(x * wave.freq * 1.6 + time * wave.speed * 0.6) * (wave.amp * 0.35) +
            Math.sin(x * wave.freq * 0.4 + time * wave.speed * 1.2) * (wave.amp * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.color + (dark ? '0.18)' : '0.1)');
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  useEffect(() => {
    const cleanup = draw();

    const handleResize = () => {
      cancelAnimationFrame(animRef.current);
      draw();
    };
    window.addEventListener('resize', handleResize);

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(animRef.current);
      draw();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      if (cleanup) cleanup();
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [draw]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.85 }}
      aria-hidden="true"
    />
  );
};

export default AuthAuroraCanvas;
