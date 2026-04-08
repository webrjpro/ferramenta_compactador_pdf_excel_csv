(function () {
  "use strict";

  const MAX_RENDER_PIXELS = 14_000_000;
  const STAGE_PROFILES = {
    quality: [
      { label: "Qualidade maxima (165%, Q 0.93)", scale: 1.65, quality: 0.93 },
      { label: "Alta (145%, Q 0.90)", scale: 1.45, quality: 0.9 },
      { label: "Boa (125%, Q 0.86)", scale: 1.25, quality: 0.86 },
      { label: "Padrao alta (110%, Q 0.82)", scale: 1.1, quality: 0.82 },
      { label: "Balanceada (95%, Q 0.76)", scale: 0.95, quality: 0.76 },
      { label: "Forte (82%, Q 0.68)", scale: 0.82, quality: 0.68 },
      { label: "Muito forte (70%, Q 0.60)", scale: 0.7, quality: 0.6 },
      { label: "Extrema (58%, Q 0.52)", scale: 0.58, quality: 0.52 },
    ],
    balanced: [
      { label: "Alta (145%, Q 0.90)", scale: 1.45, quality: 0.9 },
      { label: "Boa (122%, Q 0.84)", scale: 1.22, quality: 0.84 },
      { label: "Padrao (105%, Q 0.80)", scale: 1.05, quality: 0.8 },
      { label: "Media (90%, Q 0.72)", scale: 0.9, quality: 0.72 },
      { label: "Forte (78%, Q 0.64)", scale: 0.78, quality: 0.64 },
      { label: "Muito forte (66%, Q 0.57)", scale: 0.66, quality: 0.57 },
      { label: "Extrema (56%, Q 0.50)", scale: 0.56, quality: 0.5 },
    ],
    compact: [
      { label: "Padrao (105%, Q 0.80)", scale: 1.05, quality: 0.8 },
      { label: "Media (88%, Q 0.70)", scale: 0.88, quality: 0.7 },
      { label: "Forte (76%, Q 0.62)", scale: 0.76, quality: 0.62 },
      { label: "Muito forte (64%, Q 0.56)", scale: 0.64, quality: 0.56 },
      { label: "Extrema (54%, Q 0.48)", scale: 0.54, quality: 0.48 },
    ],
  };

  const form = document.getElementById("compress-form");
  const pdfInput = document.getElementById("pdf-input");
  const maxMbInput = document.getElementById("max-mb");
  const qualityProfileInput = document.getElementById("quality-profile");
  const runBtn = document.getElementById("run-btn");
  const status = document.getElementById("status");
  const substatus = document.getElementById("substatus");
  const report = document.getElementById("report");
  const reportBody = document.getElementById("report-body");

  /* ── UI: drop-zone drag-and-drop feedback ──────────── */
  const dropZone = document.getElementById("drop-zone");
  const fileBadges = document.getElementById("file-badges");
  const progressWrap = document.getElementById("progress-wrap");
  const progressBar = document.getElementById("progress-bar");

  if (dropZone) {
    ["dragenter", "dragover"].forEach((evt) =>
      dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
      })
    );
    ["dragleave", "drop"].forEach((evt) =>
      dropZone.addEventListener(evt, () =>
        dropZone.classList.remove("drag-over")
      )
    );
    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        pdfInput.files = e.dataTransfer.files;
        pdfInput.dispatchEvent(new Event("change"));
      }
    });
  }

  pdfInput.addEventListener("change", () => {
    if (!fileBadges) return;
    fileBadges.innerHTML = "";
    Array.from(pdfInput.files || []).forEach((f) => {
      const span = document.createElement("span");
      span.className = "file-badge";
      span.innerHTML = `<span class="badge-icon">📄</span> ${f.name}`;
      fileBadges.appendChild(span);
    });
  });

  function setProgress(pct) {
    if (!progressWrap || !progressBar) return;
    progressWrap.classList.remove("hidden");
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }
  function hideProgress() {
    if (progressWrap) progressWrap.classList.add("hidden");
    if (progressBar) progressBar.style.width = "0%";
  }

  if (!window.pdfjsLib || !window.jspdf || !window.JSZip) {
    status.textContent = "Falha ao carregar bibliotecas (PDF.js / jsPDF / JSZip).";
    return;
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const jsPDF = window.jspdf.jsPDF;

  function toMb(bytes) {
    return bytes / (1024 * 1024);
  }

  function sanitizeBaseName(name) {
    const onlyName = name.replace(/^.*[\\/]/, "");
    const withoutExt = onlyName.replace(/\.pdf$/i, "");
    return withoutExt || "arquivo";
  }

  function uniqueOutputName(base, used) {
    let candidate = base + "_comprimido.pdf";
    let i = 1;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${base}_comprimido_${i}.pdf`;
      i += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  }

  function safeMaxMb(input) {
    const value = Number(input);
    if (!Number.isFinite(value)) return 15;
    if (value < 1) return 1;
    if (value > 15) return 15;
    return value;
  }

  function safeProfile(input) {
    if (input && Object.prototype.hasOwnProperty.call(STAGE_PROFILES, input)) {
      return input;
    }
    return "quality";
  }

  function setBusy(isBusy) {
    runBtn.disabled = isBusy;
    pdfInput.disabled = isBusy;
    maxMbInput.disabled = isBusy;
    qualityProfileInput.disabled = isBusy;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function scaleForMemory(width, height, desiredScale) {
    const pixels = width * height * desiredScale * desiredScale;
    if (pixels <= MAX_RENDER_PIXELS) return desiredScale;
    const ratio = Math.sqrt(MAX_RENDER_PIXELS / (width * height));
    return desiredScale * ratio;
  }

  async function rasterizePdf(originalBytes, stage, progressCb) {
    const loadingTask = window.pdfjsLib.getDocument({
      data: originalBytes,
      disableRange: true,
      disableStream: true,
      disableAutoFetch: true,
      useWorkerFetch: false,
    });
    const sourcePdf = await loadingTask.promise;
    const pageCount = sourcePdf.numPages;
    let outputPdf = null;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await sourcePdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const finalScale = scaleForMemory(
        baseViewport.width,
        baseViewport.height,
        stage.scale
      );
      const viewport = page.getViewport({ scale: finalScale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext("2d", { alpha: false });

      await page.render({
        canvasContext: ctx,
        viewport,
        background: "white",
      }).promise;

      // Mantem tamanho fisico original da pagina. So melhora a nitidez do raster.
      const widthPt = baseViewport.width;
      const heightPt = baseViewport.height;
      const orientation = widthPt > heightPt ? "landscape" : "portrait";
      const jpgData = canvas.toDataURL("image/jpeg", stage.quality);

      if (!outputPdf) {
        outputPdf = new jsPDF({
          orientation,
          unit: "pt",
          format: [widthPt, heightPt],
          compress: true,
          putOnlyUsedFonts: true,
        });
      } else {
        outputPdf.addPage([widthPt, heightPt], orientation);
      }

      outputPdf.addImage(
        jpgData,
        "JPEG",
        0,
        0,
        widthPt,
        heightPt,
        undefined,
        "MEDIUM"
      );

      canvas.width = 1;
      canvas.height = 1;

      if (progressCb) {
        progressCb(pageNumber, pageCount);
      }
    }

    const outArrayBuffer = outputPdf.output("arraybuffer");
    return new Blob([outArrayBuffer], { type: "application/pdf" });
  }

  async function compressPdfToLimit(file, maxBytes, profile, onMessage) {
    const originalArrayBuffer = await file.arrayBuffer();
    const originalBytes = new Uint8Array(originalArrayBuffer);
    const originalBlob = new Blob([originalBytes], { type: "application/pdf" });

    if (originalBlob.size <= maxBytes) {
      return {
        outputBlob: originalBlob,
        attempts: 0,
        method: "Sem compressao (ja estava no limite)",
        targetMet: true,
      };
    }

    let bestBlob = originalBlob;
    let bestMethod = "Nenhum metodo melhorou o arquivo";
    let attempts = 0;
    const stages = STAGE_PROFILES[profile] || STAGE_PROFILES.quality;

    for (const stage of stages) {
      attempts += 1;
      if (onMessage) onMessage(`Tentativa ${attempts}: ${stage.label}`);

      try {
        const compressedBlob = await rasterizePdf(
          originalBytes,
          stage,
          (page, total) => {
            if (onMessage) onMessage(`Tentativa ${attempts}: pagina ${page}/${total}`);
          }
        );

        if (compressedBlob.size < bestBlob.size) {
          bestBlob = compressedBlob;
          bestMethod = `Rasterizacao ${stage.label}`;
        }

        if (bestBlob.size <= maxBytes) {
          break;
        }
      } catch (err) {
        if (onMessage) onMessage(`Falha na tentativa ${attempts}. Continuando...`);
      }
    }

    return {
      outputBlob: bestBlob,
      attempts,
      method: bestMethod,
      targetMet: bestBlob.size <= maxBytes,
    };
  }

  function renderReport(rows) {
    reportBody.innerHTML = "";
    for (const row of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${row.inputName}</td>
        <td>${toMb(row.originalBytes).toFixed(2)}</td>
        <td>${toMb(row.finalBytes).toFixed(2)}</td>
        <td>${row.targetMet ? "Sim" : "Nao"}</td>
        <td>${row.method}</td>
      `;
      reportBody.appendChild(tr);
    }
    report.classList.remove("hidden");
  }

  async function makeFinalDownload(results) {
    if (results.length === 1) {
      const one = results[0];
      downloadBlob(one.outputBlob, one.outputName);
      return one.outputName;
    }

    const zip = new window.JSZip();
    for (const result of results) {
      zip.file(result.outputName, result.outputBlob);
    }
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });
    const zipName = "pdfs_comprimidos.zip";
    downloadBlob(zipBlob, zipName);
    return zipName;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    report.classList.add("hidden");
    status.textContent = "";
    substatus.textContent = "";
    hideProgress();

    const files = Array.from(pdfInput.files || []).filter((f) =>
      /\.pdf$/i.test(f.name)
    );
    if (!files.length) {
      status.textContent = "Selecione pelo menos um arquivo PDF.";
      return;
    }

    const maxMb = safeMaxMb(maxMbInput.value);
    const maxBytes = maxMb * 1024 * 1024;
    const profile = safeProfile(qualityProfileInput.value);
    const usedNames = new Set();
    const results = [];

    setBusy(true);
    status.textContent = "Comprimindo arquivos...";
    setProgress(0);

    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        substatus.textContent = `Arquivo ${i + 1}/${files.length}: ${file.name}`;
        setProgress((i / files.length) * 100);

        const run = await compressPdfToLimit(file, maxBytes, profile, (msg) => {
          substatus.textContent = `Arquivo ${i + 1}/${files.length}: ${file.name} | ${msg}`;
        });

        const outputName = uniqueOutputName(sanitizeBaseName(file.name), usedNames);
        results.push({
          inputName: file.name,
          outputName,
          outputBlob: run.outputBlob,
          originalBytes: file.size,
          finalBytes: run.outputBlob.size,
          method: run.method,
          targetMet: run.targetMet,
          attempts: run.attempts,
        });
      }

      setProgress(100);
      const deliveredName = await makeFinalDownload(results);
      renderReport(results);
      status.textContent = `✅ Concluído! Download: ${deliveredName}`;
      substatus.textContent = "";
    } catch (err) {
      status.textContent = "❌ Erro ao processar os PDFs.";
      substatus.textContent = err && err.message ? err.message : "Falha inesperada.";
    } finally {
      setBusy(false);
      setTimeout(hideProgress, 2000);
    }
  });
})();
