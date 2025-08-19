/**
 * 前端图片融合工具
 * 使用 HTML Canvas API 实现图片融合，完全在浏览器端运行
 * 支持色彩转移、透明度处理、多种融合模式
 */

/**
 * 加载图片为 Canvas ImageData
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, imageData: ImageData}>}
 */

/**
 * 直接绘制到给定画布的实时预览版本（无 DataURL 转码）
 * @param {string} foregroundUrl - 前景图片URL
 * @param {string} backgroundUrl - 背景图片URL
 * @param {Object} options - 融合选项（与 fuseImages 一致）
 * @param {HTMLCanvasElement} targetCanvas - 目标画布
 * @returns {Promise<HTMLCanvasElement>} 返回传入的 targetCanvas
 */
export async function fuseImagesToCanvas(foregroundUrl, backgroundUrl, options = {}, targetCanvas) {
  if (!targetCanvas) throw new Error('需要提供 targetCanvas');
  try {
    const [fgData, bgData] = await Promise.all([
      loadImageToCanvas(foregroundUrl),
      loadImageToCanvas(backgroundUrl)
    ]);

    const canvasWidth = bgData.canvas.width;
    const canvasHeight = bgData.canvas.height;
    targetCanvas.width = canvasWidth;
    targetCanvas.height = canvasHeight;
    // 保持预览不拉伸：设置 CSS 宽高与纵横比
    if (targetCanvas.style) {
      targetCanvas.style.aspectRatio = `${canvasWidth} / ${canvasHeight}`;
      targetCanvas.style.width = '100%';
      targetCanvas.style.height = 'auto';
    }
    const finalCtx = targetCanvas.getContext('2d');

    // 前景可见区域与缩放、定位（底部对齐）
    const bounds = getOpaqueBounds(fgData.canvas);
    const scaleByWidth = canvasWidth / bounds.width;
    const scaleByHeight = canvasHeight / bounds.height;
    const finalScale = Math.min(scaleByWidth, scaleByHeight, 1.0);
    const fgDisplayWidth = Math.round(bounds.width * finalScale);
    const fgDisplayHeight = Math.round(bounds.height * finalScale);
    const fgX = Math.round((canvasWidth - fgDisplayWidth) / 2);
    const fgY = canvasHeight - fgDisplayHeight;

    // 背景
    finalCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    finalCtx.drawImage(bgData.canvas, 0, 0, canvasWidth, canvasHeight);

    // 前景预处理：打光与色彩转移
    const lt = options.lighting;
    let processedImageData = fgData.imageData;
    const ltDisabled = lt === false || (typeof lt === 'object' && lt.enabled === false);
    if (!ltDisabled) {
      const ltOpts = typeof lt === 'object' ? lt : {};
      // 地面影子
      if (ltOpts.ground && ltOpts.ground.enabled !== false) {
        const g = ltOpts.ground;
        const opacity = typeof g.opacity === 'number' ? Math.max(0, Math.min(1, g.opacity)) : 0.25;
        const widthScale = typeof g.widthScale === 'number' ? g.widthScale : 0.45;
        const heightPx = typeof g.heightPx === 'number' ? g.heightPx : Math.max(8, Math.round(fgDisplayHeight * 0.05));
        const offsetYPx = typeof g.offsetY === 'number' ? g.offsetY : 4;

        const cx = fgX + fgDisplayWidth / 2;
        const cy = fgY + fgDisplayHeight + offsetYPx;
        const rx = Math.max(4, fgDisplayWidth * widthScale);
        const ry = Math.max(2, heightPx);

        finalCtx.save();
        finalCtx.translate(cx, cy);
        finalCtx.scale(rx, ry);
        const grad = finalCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        finalCtx.fillStyle = grad;
        finalCtx.beginPath();
        finalCtx.arc(0, 0, 1, 0, Math.PI * 2);
        finalCtx.fill();
        finalCtx.restore();
      }

      processedImageData = applyDirectionalLighting(processedImageData, ltOpts);
    }

    const ct = options.colorTransfer;
    const ctDisabled = ct === false || (typeof ct === 'object' && ct.enabled === false);
    if (!ctDisabled) {
      const ctOpts = typeof ct === 'object' ? ct : {};
      processedImageData = applyColorTransfer(processedImageData, bgData.imageData, ctOpts);
    }

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = fgData.canvas.width;
    tempCanvas.height = fgData.canvas.height;
    tempCtx.putImageData(processedImageData, 0, 0);

    finalCtx.globalCompositeOperation = 'source-over';
    finalCtx.drawImage(
      tempCanvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      fgX, fgY, fgDisplayWidth, fgDisplayHeight
    );

    return targetCanvas;
  } catch (error) {
    console.error('❌ 预览绘制失败:', error);
    throw error;
  }
}
export async function loadImageToCanvas(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      resolve({ canvas, ctx, imageData });
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * 计算图像的RGB统计信息（均值和标准差）
 * @param {ImageData} imageData - 图像数据
 * @returns {{mean: {r: number, g: number, b: number}, std: {r: number, g: number, b: number}}}
 */
export function calculateImageStats(imageData) {
  const data = imageData.data;
  const pixels = data.length / 4;
  
  let sumR = 0, sumG = 0, sumB = 0;
  let validPixels = 0;
  
  // 计算均值（跳过透明像素）
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) { // 只计算非透明像素
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      validPixels++;
    }
  }
  
  const meanR = validPixels > 0 ? sumR / validPixels : 0;
  const meanG = validPixels > 0 ? sumG / validPixels : 0;
  const meanB = validPixels > 0 ? sumB / validPixels : 0;
  
  // 计算标准差
  let varR = 0, varG = 0, varB = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      varR += Math.pow(data[i] - meanR, 2);
      varG += Math.pow(data[i + 1] - meanG, 2);
      varB += Math.pow(data[i + 2] - meanB, 2);
    }
  }
  
  const stdR = validPixels > 1 ? Math.sqrt(varR / (validPixels - 1)) : 0;
  const stdG = validPixels > 1 ? Math.sqrt(varG / (validPixels - 1)) : 0;
  const stdB = validPixels > 1 ? Math.sqrt(varB / (validPixels - 1)) : 0;
  
  return {
    mean: { r: meanR, g: meanG, b: meanB },
    std: { r: stdR, g: stdG, b: stdB }
  };
}

/**
 * 在前景上应用角落打光（左上/右上），模拟来自上方的方向光
 * @param {ImageData} sourceData - 源图像数据（前景）
 * @param {Object} opts
 * @param {('left-top'|'right-top')} [opts.direction='left-top'] - 打光方向
 * @param {number} [opts.intensity=0.25] - 强度（0~1），数值越大打光越明显
 * @param {number} [opts.softness=0.75] - 软化半径（0~1），越大过渡越柔和
 * @returns {ImageData} 打光后的图像数据
 */
export function applyDirectionalLighting(sourceData, opts = {}) {
  const {
    direction = 'left-top',
    intensity = 0.6,
    softness = 0.75,
    // 侧向阴影：与打光方向相反一侧适度压暗，增强立体感
    shadowIntensity = 0.3,
  } = opts;

  const w = sourceData.width;
  const h = sourceData.height;
  const data = new Uint8ClampedArray(sourceData.data); // 拷贝

  // 光源角落坐标（像素坐标）
  const lightX = direction === 'right-top' ? (w - 1) : 0;
  const lightY = 0; // 顶部
  // 阴影角落（与光源对角）
  const shadowCornerX = direction === 'right-top' ? 0 : (w - 1);
  const shadowCornerY = h - 1;

  // 软化半径像素尺度
  const maxDim = Math.max(w, h);
  const radius = Math.max(1, softness * maxDim);
  const radiusOpp = radius; // 使用同一软化尺度

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = data[idx + 3];
      if (a === 0) continue; // 跳过全透明

      // 到光源角的距离（像素）
      const dx = x - lightX;
      const dy = y - lightY;
      const dist = Math.hypot(dx, dy);

      // 归一化并根据软化半径平滑
      const d = Math.min(1, dist / radius);
      // 亮度系数：角落最亮，向远处衰减到 1
      let gain = 1 + intensity * (1 - d);

      if (shadowIntensity > 0) {
        const sx = x - shadowCornerX;
        const sy = y - shadowCornerY;
        const sdist = Math.hypot(sx, sy);
        const sd = Math.min(1, sdist / radiusOpp);
        // 阴影系数：对角处最暗，向光源方向逐渐减弱
        const shadowMul = 1 - shadowIntensity * (1 - sd);
        gain *= Math.max(0, shadowMul);
      }

      // 应用到 RGB，避免溢出
      data[idx] = Math.min(255, Math.round(data[idx] * gain));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * gain));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * gain));
    }
  }

  return new ImageData(data, w, h);
}

/**
 * 应用色彩转移算法
 * @param {ImageData} sourceData - 源图像数据（前景）
 * @param {ImageData} targetData - 目标图像数据（背景）
 * @param {Object} opts - 可选参数
 * @param {number} [opts.strength=0.6] - 色彩转移强度（0~1），数值越小越保留原图细节
 * @param {[number,number]} [opts.stdClamp=[0.85,1.15]] - 对比度缩放的夹取范围
 * @param {boolean} [opts.preserveHighlights=true] - 对高光区域减弱色彩转移
 * @returns {ImageData} 色彩转移后的图像数据
 */
export function applyColorTransfer(sourceData, targetData, opts = {}) {
  const {
    strength = 0.6,
    stdClamp = [0.85, 1.15],
    preserveHighlights = true,
  } = opts;
  const sourceStats = calculateImageStats(sourceData);
  const targetStats = calculateImageStats(targetData);
  
  const result = new ImageData(
    new Uint8ClampedArray(sourceData.data),
    sourceData.width,
    sourceData.height
  );
  
  const data = result.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    
    if (alpha > 0) { // 只处理非透明像素
      // 应用色彩转移公式：(pixel - source_mean) * (target_std / source_std) + target_mean
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // 防止除零
      const stdRatio = {
        r: sourceStats.std.r > 0 ? targetStats.std.r / sourceStats.std.r : 1,
        g: sourceStats.std.g > 0 ? targetStats.std.g / sourceStats.std.g : 1,
        b: sourceStats.std.b > 0 ? targetStats.std.b / sourceStats.std.b : 1
      };
      // 限制对比度缩放比例，避免过度“冲/灰”
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const cr = clamp(stdRatio.r, stdClamp[0], stdClamp[1]);
      const cg = clamp(stdRatio.g, stdClamp[0], stdClamp[1]);
      const cb = clamp(stdRatio.b, stdClamp[0], stdClamp[1]);
      
      const newR = (r - sourceStats.mean.r) * cr + targetStats.mean.r;
      const newG = (g - sourceStats.mean.g) * cg + targetStats.mean.g;
      const newB = (b - sourceStats.mean.b) * cb + targetStats.mean.b;

      // 对高光区域减弱转移强度，避免白衬衫被“染色”
      let atten = 1.0;
      if (preserveHighlights) {
        const avg = (r + g + b) / 3;
        if (avg > 235) {
          atten = 0.3; // 非常亮的区域大幅降低
        } else if (avg > 210) {
          atten = 0.6; // 高亮区域适度降低
        }
      }
      const mix = Math.max(0, Math.min(1, strength * atten));
      const outR = r * (1 - mix) + newR * mix;
      const outG = g * (1 - mix) + newG * mix;
      const outB = b * (1 - mix) + newB * mix;
      
      // 限制在0-255范围内
      data[i] = Math.max(0, Math.min(255, outR));
      data[i + 1] = Math.max(0, Math.min(255, outG));
      data[i + 2] = Math.max(0, Math.min(255, outB));
    }
  }
  
  return result;
}

/**
 * 调整图像大小以匹配目标尺寸
 * @param {HTMLCanvasElement} sourceCanvas - 源画布
 * @param {number} targetWidth - 目标宽度
 * @param {number} targetHeight - 目标高度
 * @returns {HTMLCanvasElement} 调整大小后的画布
 */
export function resizeCanvas(sourceCanvas, targetWidth, targetHeight) {
  const resizedCanvas = document.createElement('canvas');
  const ctx = resizedCanvas.getContext('2d');
  
  resizedCanvas.width = targetWidth;
  resizedCanvas.height = targetHeight;
  
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
  
  return resizedCanvas;
}

/**
 * 计算画布中非透明像素的包围盒（忽略透明留白）
 * @param {HTMLCanvasElement} canvas
 * @returns {{x:number,y:number,width:number,height:number}} 可见区域边界
 */
function getOpaqueBounds(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, width, height).data;

  let top = -1, bottom = -1, left = -1, right = -1;

  // 扫描顶部
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4 + 3; // alpha
      if (data[idx] > 0) { top = y; break; }
    }
    if (top !== -1) break;
  }

  // 扫描底部
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4 + 3;
      if (data[idx] > 0) { bottom = y; break; }
    }
    if (bottom !== -1) break;
  }

  // 扫描左侧
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4 + 3;
      if (data[idx] > 0) { left = x; break; }
    }
    if (left !== -1) break;
  }

  // 扫描右侧
  for (let x = width - 1; x >= 0; x--) {
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4 + 3;
      if (data[idx] > 0) { right = x; break; }
    }
    if (right !== -1) break;
  }

  if (top === -1 || bottom === -1 || left === -1 || right === -1) {
    // 整张图都透明，返回全图避免异常
    return { x: 0, y: 0, width, height };
  }

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * 主要的图片融合函数 - 重新设计确保底部对齐
 * @param {string} foregroundUrl - 前景图片URL
 * @param {string} backgroundUrl - 背景图片URL
 * @param {Object} options - 融合选项
 * @returns {Promise<string>} 融合后的图片DataURL
 */
export async function fuseImages(foregroundUrl, backgroundUrl, options = {}) {
  try {
    // 加载两张图片
    const [fgData, bgData] = await Promise.all([
      loadImageToCanvas(foregroundUrl),
      loadImageToCanvas(backgroundUrl)
    ]);
    
    // 使用背景图片的尺寸作为最终画布尺寸
    const canvasWidth = bgData.canvas.width;
    const canvasHeight = bgData.canvas.height;
    
    // 计算前景可见（非透明）区域，避免透明留白影响对齐
    const bounds = getOpaqueBounds(fgData.canvas);
    
    // 计算缩放比例 - 确保前景完全适合背景
    const scaleByWidth = canvasWidth / bounds.width;
    const scaleByHeight = canvasHeight / bounds.height;
    const finalScale = Math.min(scaleByWidth, scaleByHeight, 1.0); // 不放大，只缩小
    
    const fgDisplayWidth = Math.round(bounds.width * finalScale);
    const fgDisplayHeight = Math.round(bounds.height * finalScale);
    
    // 计算前景位置：水平居中 + 底部对齐
    const fgX = Math.round((canvasWidth - fgDisplayWidth) / 2);
    const fgY = canvasHeight - fgDisplayHeight; // 关键：底部对齐
    
    // 创建最终融合画布
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = canvasWidth;
    finalCanvas.height = canvasHeight;
    
    // 绘制背景
    finalCtx.drawImage(bgData.canvas, 0, 0, canvasWidth, canvasHeight);
    
    // 1) 可选：先对前景打光（在色彩转移之前）
    const lt = options.lighting;
    let processedImageData = fgData.imageData;
    const ltDisabled = lt === false || (typeof lt === 'object' && lt.enabled === false);
    if (!ltDisabled) {
      const ltOpts = typeof lt === 'object' ? lt : {};
      // 地面影子（在绘制前景之前，先画到最终画布）
      if (ltOpts.ground && ltOpts.ground.enabled !== false) {
        const g = ltOpts.ground;
        const opacity = typeof g.opacity === 'number' ? Math.max(0, Math.min(1, g.opacity)) : 0.25;
        const widthScale = typeof g.widthScale === 'number' ? g.widthScale : 0.45; // 相对人物宽度
        const heightPx = typeof g.heightPx === 'number' ? g.heightPx : Math.max(8, Math.round(fgDisplayHeight * 0.05));
        const offsetYPx = typeof g.offsetY === 'number' ? g.offsetY : 4; // 向下偏移

        // 影子椭圆中心（人物脚下中点）
        const cx = fgX + fgDisplayWidth / 2;
        const cy = fgY + fgDisplayHeight + offsetYPx;
        const rx = Math.max(4, fgDisplayWidth * widthScale);
        const ry = Math.max(2, heightPx);

        finalCtx.save();
        finalCtx.translate(cx, cy);
        finalCtx.scale(rx, ry);
        const grad = finalCtx.createRadialGradient(0, 0, 0, 0, 0, 1);
        grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        finalCtx.fillStyle = grad;
        finalCtx.beginPath();
        finalCtx.arc(0, 0, 1, 0, Math.PI * 2);
        finalCtx.fill();
        finalCtx.restore();
      }

      processedImageData = applyDirectionalLighting(processedImageData, ltOpts);
    }

    // 2) 应用色彩转移到前景（可关闭或传入参数控制强度与对比度夹取）
    const ct = options.colorTransfer;
    const ctDisabled = ct === false || (typeof ct === 'object' && ct.enabled === false);
    if (!ctDisabled) {
      const ctOpts = typeof ct === 'object' ? ct : {};
      processedImageData = applyColorTransfer(processedImageData, bgData.imageData, ctOpts);
    }
    
    // 创建临时画布用于色彩转移后的前景
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = fgData.canvas.width;
    tempCanvas.height = fgData.canvas.height;
    tempCtx.putImageData(processedImageData, 0, 0);
    
    // 绘制前景到最终位置（水平居中，底部对齐），仅使用可见区域
    finalCtx.globalCompositeOperation = 'source-over';
    finalCtx.drawImage(
      tempCanvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      fgX, fgY, fgDisplayWidth, fgDisplayHeight
    );
    
    // 返回DataURL
    return finalCanvas.toDataURL('image/png');
    
  } catch (error) {
    console.error('❌ 前端融合失败:', error);
    throw new Error(`图片融合失败: ${error.message}`);
  }
}

/**
 * 简化的融合函数（仅叠加，不做色彩转移）- 底部对齐版本
 * @param {string} foregroundUrl - 前景图片URL
 * @param {string} backgroundUrl - 背景图片URL
 * @returns {Promise<string>} 融合后的图片DataURL
 */
export async function simpleOverlay(foregroundUrl, backgroundUrl) {
  try {
    const [fgData, bgData] = await Promise.all([
      loadImageToCanvas(foregroundUrl),
      loadImageToCanvas(backgroundUrl)
    ]);
    
    // 使用背景图片的尺寸作为最终画布尺寸
    const canvasWidth = bgData.canvas.width;
    const canvasHeight = bgData.canvas.height;
    
    // 计算前景可见（非透明）区域，避免透明留白影响对齐
    const bounds = getOpaqueBounds(fgData.canvas);
    
    // 计算缩放比例 - 确保前景完全适合背景
    const scaleByWidth = canvasWidth / bounds.width;
    const scaleByHeight = canvasHeight / bounds.height;
    const finalScale = Math.min(scaleByWidth, scaleByHeight, 1.0); // 不放大，只缩小
    
    const fgDisplayWidth = Math.round(bounds.width * finalScale);
    const fgDisplayHeight = Math.round(bounds.height * finalScale);
    
    // 计算前景位置：水平居中 + 底部对齐
    const fgX = Math.round((canvasWidth - fgDisplayWidth) / 2);
    const fgY = canvasHeight - fgDisplayHeight; // 关键：底部对齐
    
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    finalCanvas.width = canvasWidth;
    finalCanvas.height = canvasHeight;
    
    // 绘制背景
    finalCtx.drawImage(bgData.canvas, 0, 0, canvasWidth, canvasHeight);
    
    // 绘制前景到最终位置（水平居中，底部对齐），仅使用可见区域
    finalCtx.drawImage(
      fgData.canvas,
      bounds.x, bounds.y, bounds.width, bounds.height,
      fgX, fgY, fgDisplayWidth, fgDisplayHeight
    );
    
    return finalCanvas.toDataURL('image/png');

  } catch (error) {
    console.error('❌ 简单叠加失败:', error);
    throw new Error(`图片叠加失败: ${error.message}`);
  }
}
