const form = document.querySelector("#goal-form");
const goalInput = document.querySelector("#goal");
const charCount = document.querySelector("#char-count");
const generateButton = document.querySelector("#generate-btn");
const buttonText = document.querySelector("#button-text");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");
const errorMessage = document.querySelector("#error-message");
const output = document.querySelector("#roadmap-output");
const retryButton = document.querySelector("#retry-btn");

let lastFormData = null;
let currentRoadmap = null;
const STORAGE_KEY = "roadmapai_saved_roadmaps_v1";

goalInput.addEventListener("input", () => {
  charCount.textContent = `${goalInput.value.length} / 800`;
});

function showState(state) {
  [emptyState, loadingState, errorState, output].forEach(el => el.classList.add("hidden"));
  state.classList.remove("hidden");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function safeUrl(rawUrl = "") {
  try {
    const url = new URL(rawUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getSavedRoadmaps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRoadmap(roadmap, formData) {
  const saved = getSavedRoadmaps();
  saved.unshift({
    id: Date.now(),
    savedAt: new Date().toISOString(),
    formData,
    roadmap
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.slice(0, 10)));
}

function calculateProgress(roadmap) {
  const tasks = (roadmap.phases || []).flatMap(phase => phase.tasks || []);
  const completed = tasks.filter(task => task.done).length;
  return { completed, total: tasks.length, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
}

function renderRoadmap(roadmap) {
  currentRoadmap = roadmap;
  const progress = calculateProgress(roadmap);
  const phasesHtml = (roadmap.phases || []).map((phase, phaseIndex) => {
    const tasksHtml = (phase.tasks || []).map((task, taskIndex) => {
      const checked = task.done ? "checked" : "";
      const doneClass = task.done ? "done" : "";
      const url = safeUrl(task.resource_url);
      return `
        <div class="task ${doneClass}">
          <input class="task-check" type="checkbox" data-phase="${phaseIndex}" data-task="${taskIndex}" aria-label="Mark ${escapeHtml(task.title)} complete" ${checked}>
          <div class="task-content">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <p class="task-details">${escapeHtml(task.details)}</p>
            <div class="task-meta">
              ${task.time ? `<span class="task-chip">◷ ${escapeHtml(task.time)}</span>` : ""}
              ${task.type ? `<span class="task-chip">${escapeHtml(task.type)}</span>` : ""}
              ${task.resource_name ? (url
                ? `<a class="task-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(task.resource_name)}</a>`
                : `<span class="task-chip">Resource: ${escapeHtml(task.resource_name)}</span>`) : ""}
            </div>
          </div>
        </div>`;
    }).join("");
    return `
      <article class="phase">
        <div class="phase-header">
          <div class="phase-number">${String(phaseIndex + 1).padStart(2, "0")}</div>
          <div class="phase-title-wrap"><h3>${escapeHtml(phase.name)}</h3><span class="phase-duration">${escapeHtml(phase.duration)}</span></div>
        </div>
        <p class="phase-objective">${escapeHtml(phase.objective)}</p>
        <div class="phase-tasks">${tasksHtml}</div>
        ${phase.milestone ? `<div class="milestone"><strong>Milestone:</strong> ${escapeHtml(phase.milestone)}</div>` : ""}
      </article>`;
  }).join("");

  const routineHtml = (roadmap.weekly_routine || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");
  const risksHtml = (roadmap.risks_and_tips || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");

  output.innerHTML = `
    <div class="roadmap-topline"><span class="roadmap-badge">✦ YOUR AI ROADMAP</span><button class="text-btn" id="new-roadmap-btn" type="button">＋ New plan</button></div>
    <h2>${escapeHtml(roadmap.title || "Your personalized roadmap")}</h2>
    <p class="roadmap-summary">${escapeHtml(roadmap.summary || "")}</p>
    <div class="stats-grid">
      <div class="stat-card"><span>EST. DURATION</span><strong>${escapeHtml(roadmap.estimated_duration || "Flexible")}</strong></div>
      <div class="stat-card"><span>TIME COMMITMENT</span><strong>${escapeHtml(roadmap.weekly_time || "Personalized")}</strong></div>
      <div class="stat-card"><span>PHASES</span><strong>${(roadmap.phases || []).length} stages</strong></div>
    </div>
    <div class="progress-block">
      <div class="progress-line"><span>Roadmap progress</span><strong id="progress-label">${progress.completed}/${progress.total} tasks · ${progress.percent}%</strong></div>
      <div class="progress-track"><div class="progress-fill" id="progress-fill" style="width:${progress.percent}%"></div></div>
    </div>
    <div id="phase-list">${phasesHtml}</div>
    ${routineHtml ? `<section class="subsection"><h3>↻ Weekly routine</h3><ul class="tip-list">${routineHtml}</ul></section>` : ""}
    ${(roadmap.success_metrics || []).length ? `<section class="subsection"><h3>◎ How you'll measure success</h3><ul class="tip-list">${roadmap.success_metrics.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></section>` : ""}
    ${risksHtml ? `<section class="subsection"><h3>✦ Watch-outs & tips</h3><ul class="tip-list">${risksHtml}</ul></section>` : ""}
    <div class="output-actions"><button class="text-btn" id="save-btn" type="button">Save in this browser</button><button class="text-btn" id="export-btn" type="button">Export as Markdown ↓</button></div>
    <p class="output-note">Progress is stored in this page while open. Saving stores a copy in this browser only. This is an AI-generated plan, so review resources and adjust the workload to your circumstances.</p>
  `;

  output.querySelectorAll(".task-check").forEach(checkbox => {
    checkbox.addEventListener("change", event => {
      const phaseIndex = Number(event.target.dataset.phase);
      const taskIndex = Number(event.target.dataset.task);
      currentRoadmap.phases[phaseIndex].tasks[taskIndex].done = event.target.checked;
      event.target.closest(".task").classList.toggle("done", event.target.checked);
      updateProgress();
    });
  });

  output.querySelector("#new-roadmap-btn").addEventListener("click", () => {
    showState(emptyState);
    goalInput.focus();
  });
  output.querySelector("#save-btn").addEventListener("click", () => {
    try {
      saveRoadmap(currentRoadmap, lastFormData);
      const btn = output.querySelector("#save-btn");
      btn.textContent = "✓ Saved in this browser";
      btn.disabled = true;
    } catch {
      alert("Could not save. Your browser may have local storage disabled.");
    }
  });
  output.querySelector("#export-btn").addEventListener("click", exportMarkdown);
  showState(output);
}

function updateProgress() {
  const progress = calculateProgress(currentRoadmap);
  const label = output.querySelector("#progress-label");
  const fill = output.querySelector("#progress-fill");
  if (label) label.textContent = `${progress.completed}/${progress.total} tasks · ${progress.percent}%`;
  if (fill) fill.style.width = `${progress.percent}%`;
}

function exportMarkdown() {
  if (!currentRoadmap) return;
  const lines = [`# ${currentRoadmap.title || "My Roadmap"}`, "", currentRoadmap.summary || "", "",
    `**Duration:** ${currentRoadmap.estimated_duration || "Flexible"}`,
    `**Weekly time:** ${currentRoadmap.weekly_time || "Not specified"}`, "",
    `## Success metrics`, ...(currentRoadmap.success_metrics || []).map(item => `- ${item}`), ""];
  (currentRoadmap.phases || []).forEach((phase, i) => {
    lines.push(`## Phase ${i + 1}: ${phase.name}`, `_${phase.duration}_`, "", phase.objective || "", "");
    (phase.tasks || []).forEach(task => {
      lines.push(`- [${task.done ? "x" : " "}] **${task.title}** (${task.time || "time not specified"})`);
      if (task.details) lines.push(`  - ${task.details}`);
      if (task.resource_name) lines.push(`  - Resource: ${task.resource_name}${task.resource_url ? ` — ${task.resource_url}` : ""}`);
    });
    if (phase.milestone) lines.push("", `**Milestone:** ${phase.milestone}`);
    lines.push("");
  });
  if (currentRoadmap.weekly_routine?.length) lines.push("## Weekly routine", ...currentRoadmap.weekly_routine.map(x => `- ${x}`), "");
  if (currentRoadmap.risks_and_tips?.length) lines.push("## Risks and tips", ...currentRoadmap.risks_and_tips.map(x => `- ${x}`), "");
  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-ai-roadmap.md";
  a.click();
  URL.revokeObjectURL(url);
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  lastFormData = {
    goal: goalInput.value.trim(),
    level: document.querySelector("#level").value,
    deadline: document.querySelector("#deadline").value,
    hours_per_week: Number(document.querySelector("#hours").value),
    interests: document.querySelector("#interests").value.trim()
  };
  if (!lastFormData.goal) return;
  generateButton.disabled = true;
  buttonText.textContent = "Building your roadmap...";
  showState(loadingState);

  try {
    const response = await fetch("/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastFormData)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Something went wrong.");
    renderRoadmap(result.roadmap);
  } catch (error) {
    errorMessage.textContent = error.message || "Please check your connection and try again.";
    showState(errorState);
  } finally {
    generateButton.disabled = false;
    buttonText.textContent = "Build my roadmap";
  }
});

retryButton.addEventListener("click", () => {
  if (lastFormData) form.requestSubmit();
  else showState(emptyState);
});
