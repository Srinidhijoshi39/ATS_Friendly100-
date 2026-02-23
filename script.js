document.addEventListener('DOMContentLoaded', () => {
    // 1. Zoom Logic
    let zoom = 100;
    const resumeCanvas = document.getElementById('resume-canvas');
    const zoomLevelEl = document.getElementById('zoom-level');

    function updateZoom() {
        if (resumeCanvas && zoomLevelEl) {
            resumeCanvas.style.transform = `scale(${zoom / 100})`;
            zoomLevelEl.textContent = `${zoom}%`;
        }
    }

    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (zoom < 150) {
                zoom += 10;
                updateZoom();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (zoom > 50) {
                zoom -= 10;
                updateZoom();
            }
        });
    }

    if (zoomLevelEl) {
        zoomLevelEl.style.cursor = 'pointer';
        zoomLevelEl.title = 'Click to reset zoom';
        zoomLevelEl.addEventListener('click', () => {
            zoom = 100;
            updateZoom();
        });
    }

    // --- Persistence Functions ---
    const DEBOUNCE_DELAY = 1000;
    let saveTimeout;

    function saveResumeData() {
        const data = {
            simpleInputs: {},
            dynamicLists: {
                experience: [],
                education: [],
                projects: [],
                'intern-projects': []
            }
        };

        // Save simple sync-inputs and sync-skills
        document.querySelectorAll('.sync-input, .sync-skills').forEach(input => {
            data.simpleInputs[input.id] = input.value;
        });

        // Save collections (Experience, Education, Projects)
        const types = ['experience', 'education', 'projects', 'intern-projects'];
        types.forEach(type => {
            let listId = type === 'projects' ? 'projects-list' : (type === 'intern-projects' ? 'intern-projects-list' : `${type}-list`);
            const container = document.getElementById(listId);
            if (container) {
                const entries = container.querySelectorAll('.dynamic-entry');
                entries.forEach(entry => {
                    const entryData = {};
                    entry.querySelectorAll('input, textarea').forEach(field => {
                        const classList = Array.from(field.classList);
                        // Identify field name from class (e.g., 'exp-role' or 'proj-title')
                        const fieldName = classList.find(c => c.includes('-') && !c.includes('input'));
                        if (fieldName) entryData[fieldName] = field.value;
                    });
                    data.dynamicLists[type].push(entryData);
                });
            }
        });

        localStorage.setItem('cv_builder_data', JSON.stringify(data));
        console.log("Progress Auto-Saved! ✓");
    }

    function loadResumeData() {
        const saved = localStorage.getItem('cv_builder_data');
        if (!saved) return false;

        const data = JSON.parse(saved);

        // Load simple inputs
        for (const id in data.simpleInputs) {
            const input = document.getElementById(id);
            if (input) {
                input.value = data.simpleInputs[id];
                input.dispatchEvent(new Event('input'));
            }
        }

        // Load dynamic lists
        for (const type in data.dynamicLists) {
            const entries = data.dynamicLists[type];
            entries.forEach(entryData => {
                const entry = addEntry(type);
                for (const fieldClass in entryData) {
                    const field = entry.querySelector(`.${fieldClass}`);
                    if (field) field.value = entryData[fieldClass];
                }
            });
            updateDynamicList(type);
        }

        return true;
    }

    function debounceSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveResumeData, DEBOUNCE_DELAY);
    }

    // 2. Real-time Sync for simple inputs
    const syncInputs = document.querySelectorAll('.sync-input');
    syncInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            debounceSave();
            const targetId = e.target.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                const val = e.target.value.trim();

                // Special handling for lists (Certs & Achievements)
                if (targetId === 'cv-certs' || targetId === 'cv-achievements') {
                    const lines = val.split('\n').map(l => l.trim()).filter(l => l);
                    const listHtml = lines.map(l => `<li>${l.replace(/^[•\-\*]\s*/, '')}</li>`).join('');
                    targetEl.innerHTML = listHtml;
                    return;
                }

                targetEl.textContent = val || e.target.placeholder;

                // Update hrefs for redirection
                if (targetId === 'cv-email') {
                    targetEl.href = val ? `mailto:${val}` : '#';
                } else if (targetId === 'cv-phone') {
                    // Remove spaces/special chars for tel link
                    const cleanPhone = val.replace(/[^0-9+]/g, '');
                    targetEl.href = val ? `tel:${cleanPhone}` : '#';
                } else if (targetId === 'cv-location') {
                    targetEl.href = val ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}` : '#';
                } else if (targetId === 'cv-links') {
                    // Add https:// if missing
                    let url = val;
                    if (url && !url.startsWith('http')) {
                        url = 'https://' + url;
                    }
                    targetEl.href = url || '#';
                }
            }
        });
    });

    const syncSkills = document.querySelectorAll('.sync-skills');
    syncSkills.forEach(input => {
        input.addEventListener('input', (e) => {
            debounceSave();
            const targetId = e.target.dataset.target;
            const targetEl = document.getElementById(targetId);
            const parentGroup = document.getElementById(`group-${targetId.replace('cv-', '')}`);

            if (targetEl) {
                const val = e.target.value.trim();
                const formatted = val.split(',').map(s => s.trim()).filter(s => s).join(', ');
                targetEl.textContent = formatted;

                // Hide the whole category if empty
                if (parentGroup) {
                    parentGroup.style.display = formatted ? 'block' : 'none';
                }
            }
        });
    });

    // 3. Dynamic Section Logic (Accordion)
    const sections = document.querySelectorAll('.form-section');
    sections.forEach(section => {
        const trigger = section.querySelector('.section-trigger');
        trigger.addEventListener('click', () => {
            sections.forEach(s => s.classList.remove('active'));
            section.classList.add('active');
        });
    });

    // 4. Dynamic Lists (Experience, Education & Projects)
    function addEntry(type) {
        let listId;
        if (type === 'projects') listId = 'projects-list';
        else if (type === 'intern-projects') listId = 'intern-projects-list';
        else listId = `${type}-list`;

        const container = document.getElementById(listId);
        if (!container) return null;

        const index = container.querySelectorAll('.dynamic-entry').length;
        let html = '';

        if (type === 'experience') {
            html = `
                <div class="dynamic-entry" data-index="${index}">
                    <div class="entry-header-actions">
                        <hr style="flex: 1; border: 0; border-top: 1px solid var(--border);">
                        <button class="delete-btn" onclick="this.closest('.dynamic-entry').remove(); updateDynamicList('${type}')">✕ Remove</button>
                    </div>
                    <div class="input-group">
                        <label>Role / Job Title</label>
                        <input type="text" placeholder="Software Developer Intern" class="exp-role">
                    </div>
                    <div class="input-group">
                        <label>Company & Location</label>
                        <input type="text" placeholder="Tech Corp" class="exp-company">
                    </div>
                    <div class="input-group">
                        <label>Duration</label>
                        <input type="text" placeholder="Jan 2024 - Present" class="exp-duration">
                    </div>
                    <div class="input-group">
                        <label>Achievements (One per line)</label>
                        <textarea placeholder="Developed X..." class="exp-desc"></textarea>
                    </div>
                </div>
            `;
        } else if (type === 'education') {
            html = `
                <div class="dynamic-entry" data-index="${index}">
                    <div class="entry-header-actions">
                        <hr style="flex: 1; border: 0; border-top: 1px solid var(--border);">
                        <button class="delete-btn" onclick="this.closest('.dynamic-entry').remove(); updateDynamicList('${type}')">✕ Remove</button>
                    </div>
                    <div class="input-group">
                        <label>Degree / Qualification</label>
                        <input type="text" placeholder="B.Tech" class="edu-degree">
                    </div>
                    <div class="input-group">
                        <label>School / University</label>
                        <input type="text" placeholder="University" class="edu-school">
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>Year / Duration</label>
                            <input type="text" placeholder="2021-2025" class="edu-year">
                        </div>
                        <div class="input-group">
                            <label>GPA / Percentage</label>
                            <input type="text" placeholder="8.5 CGPA" class="edu-gpa">
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'projects' || type === 'intern-projects') {
            html = `
                <div class="dynamic-entry" data-index="${index}">
                    <div class="entry-header-actions">
                        <hr style="flex: 1; border: 0; border-top: 1px solid var(--border);">
                        <button class="delete-btn" onclick="this.closest('.dynamic-entry').remove(); updateDynamicList('${type}')">✕ Remove</button>
                    </div>
                    <div class="input-group">
                        <label>Project Title</label>
                        <input type="text" placeholder="Project Name" class="proj-title">
                    </div>
                    <div class="input-group">
                        <label>Description & Tools</label>
                        <textarea placeholder="Describe what you built..." class="proj-desc"></textarea>
                    </div>
                </div>
            `;
        }

        container.insertAdjacentHTML('beforeend', html);
        const newEntry = container.lastElementChild;
        newEntry.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => {
                updateDynamicList(type);
                debounceSave();
            });
        });
        return newEntry;
    }

    function updateDynamicList(type) {
        let listId;
        if (type === 'projects') listId = 'projects-list';
        else if (type === 'intern-projects') listId = 'intern-projects-list';
        else listId = `${type}-list`;

        const cvListId = `cv-${type}-list`;
        const container = document.getElementById(listId);
        const cvContainer = document.getElementById(cvListId);
        if (!cvContainer || !container) return;

        cvContainer.innerHTML = '';

        const entries = container.querySelectorAll('.dynamic-entry');
        entries.forEach(entry => {
            if (type === 'experience') {
                const role = entry.querySelector('.exp-role').value || "Role";
                const company = entry.querySelector('.exp-company').value || "Company";
                const duration = entry.querySelector('.exp-duration').value || "Duration";
                const desc = entry.querySelector('.exp-desc').value || "Description";

                const bulletDesc = desc.split('\n').map(line => line.trim() ? `<li>${line}</li>` : '').join('');

                const html = `
                    <div class="cv-entry">
                        <div class="cv-entry-header">
                            <span>${role}</span>
                            <span>${duration}</span>
                        </div>
                        <div class="cv-entry-sub">${company}</div>
                        <ul class="cv-entry-desc" style="padding-left: 20px;">${bulletDesc}</ul>
                    </div>
                `;
                cvContainer.insertAdjacentHTML('beforeend', html);
            } else if (type === 'education') {
                const degree = entry.querySelector('.edu-degree').value || "Degree Name";
                const school = entry.querySelector('.edu-school').value || "University Name";
                const year = entry.querySelector('.edu-year').value || "Year";
                const gpa = entry.querySelector('.edu-gpa').value || "GPA";

                const html = `
                    <div class="cv-entry">
                        <div class="cv-entry-header">
                            <span>${degree}</span>
                            <span>${year}</span>
                        </div>
                        <div class="cv-entry-sub">${school} | ${gpa}</div>
                    </div>
                `;
                cvContainer.insertAdjacentHTML('beforeend', html);
            } else if (type === 'projects' || type === 'intern-projects') {
                const title = entry.querySelector('.proj-title').value || "Project Title";
                const desc = entry.querySelector('.proj-desc').value || "Project description...";

                const bulletProjDesc = desc.split('\n').map(line => line.trim() ? `<li>${line}</li>` : '').join('');

                const html = `
                    <div class="cv-entry">
                        <div class="cv-entry-header">
                            <span>${title}</span>
                        </div>
                        <ul class="cv-entry-desc" style="padding-left: 20px;">${bulletProjDesc}</ul>
                    </div>
                `;
                cvContainer.insertAdjacentHTML('beforeend', html);
            }
        });
    }

    // Add buttons
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            addEntry(e.target.dataset.type);
        });
    });

    // Save buttons logic
    document.querySelectorAll('.save-btn').forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
            const originalText = btn.textContent;
            btn.textContent = "Saved! ✓";
            btn.classList.add('saved');

            const sections = document.querySelectorAll('.form-section');
            const totalSteps = sections.length;

            // Move to next section after 800ms
            setTimeout(() => {
                if (index < totalSteps - 1) {
                    sections.forEach(s => s.classList.remove('active'));
                    sections[index + 1].classList.add('active');
                    sections[index + 1].scrollIntoView({ behavior: 'smooth', block: 'start' });

                    // Update Progress
                    const nextStep = index + 2;
                    const progress = (nextStep / totalSteps) * 100;
                    document.getElementById('form-progress').style.width = `${progress}%`;
                    document.getElementById('progress-text').textContent = `Step ${nextStep} of ${totalSteps}`;
                } else {
                    // Final Section Saved
                    btn.textContent = "All Done! 🎉";
                    document.getElementById('form-progress').style.width = `100%`;
                    document.getElementById('progress-text').textContent = `Resume Complete! 100%`;
                }

                if (btn.textContent !== "All Done! 🎉") {
                    btn.textContent = originalText;
                }
                btn.classList.remove('saved');
            }, 800);
        });
    });

    // Attach initial dynamic listeners
    document.querySelectorAll('.dynamic-list').forEach(list => {
        const type = list.id.split('-')[0];
        list.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('input', () => updateDynamicList(type));
        });
        updateDynamicList(type);
    });

    // 5. Download / Export
    const downloadPdf = () => {
        alert("Opening Print Preview. Please choose 'Save as PDF' in the Destination list to download as a PDF file.");
        window.print();
    };

    const downloadWord = () => {
        const resumeElement = document.getElementById('resume-canvas');

        const styles = `
            <style>
                body { font-family: 'Times New Roman', Times, serif; padding: 20px; }
                .cv-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .cv-header h1 { font-size: 24pt; margin-bottom: 5px; text-transform: uppercase; }
                .cv-contact { font-size: 10pt; color: #444; margin-bottom: 5px; }
                .cv-links { font-size: 10pt; color: #444; margin-bottom: 10px; }
                a { color: #000; text-decoration: none; }
                .cv-section { margin-top: 15px; }
                .cv-section-title { font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; text-transform: uppercase; padding-bottom: 3px; margin-bottom: 10px; }
                .cv-entry { margin-bottom: 10px; }
                .cv-entry-header { font-weight: bold; display: table; width: 100%; }
                .cv-entry-header span:first-child { display: table-cell; text-align: left; }
                .cv-entry-header span:last-child { display: table-cell; text-align: right; }
                .cv-entry-sub { font-weight: normal; color: #444; }
                ul { margin-top: 5px; margin-bottom: 5px; padding-left: 20px; }
                li { font-size: 10pt; margin-bottom: 2px; }
                p { font-size: 10pt; line-height: 1.4; }
                .skill-group { margin-bottom: 5px; font-size: 10pt; }
            </style>
        `;

        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>Resume Export</title>" + styles + "</head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + resumeElement.innerHTML + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = 'Srinidhi_Joshi_Resume.doc';
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    document.getElementById('download-pdf').addEventListener('click', downloadPdf);
    document.getElementById('download-word').addEventListener('click', downloadWord);

    // Toggle dropdown on click for mobile/touch
    document.getElementById('main-download-btn').addEventListener('click', (e) => {
        const content = document.querySelector('.dropdown-content');
        const isVisible = content.style.display === 'block';
        content.style.display = isVisible ? 'none' : 'block';
        e.stopPropagation();
    });

    // Close dropdown when clicking elsewhere
    document.addEventListener('click', () => {
        document.querySelector('.dropdown-content').style.display = 'none';
    });

    // 6. Pre-fill with Sample Data
    function prefillWithSampleData() {
        document.getElementById('full-name').value = "John Doe";
        document.getElementById('email').value = "john.doe@example.com";
        document.getElementById('phone').value = "+1 123 456 7890";
        document.getElementById('location').value = "City, Country";
        document.getElementById('linkedin').value = "linkedin.com/in/johndoe";
        document.getElementById('summary').value = "Passionate Software Developer with experience in building responsive web applications and efficient backend systems. Skilled in React, Node.js, and modern cloud architectures.";

        // Technical Skills
        const skillMappings = {
            'tech-languages': "JavaScript, Python, SQL, HTML5, CSS3",
            'tech-backend': "Node.js, Express, PostgreSQL",
            'tech-frontend': "React.js, Tailwind CSS, Recharts",
            'tech-iot': "Arduino, ESP32, IoT Fundamentals",
            'tech-tools': "Git, GitHub, Docker, AWS",
            'tech-ai': "Pandas, Scikit-learn, Basic Machine Learning"
        };

        Object.keys(skillMappings).forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.value = skillMappings[id];
                input.dispatchEvent(new Event('input'));
            }
        });

        document.getElementById('certs').value = "Certified Web Developer - Tech Institute\nCloud Computing Specialist - Cloud Academy";
        document.getElementById('certs').dispatchEvent(new Event('input'));

        document.getElementById('achievements').value = "Winner - Regional Hackathon 2024\nDean's List for Academic Excellence\nCommunity Open Source Contributor";
        document.getElementById('achievements').dispatchEvent(new Event('input'));

        // Experience Section
        const experiences = [
            {
                role: "Full Stack Developer",
                company: "Tech Solutions Inc.",
                duration: "Jan 2023 - Present",
                desc: "Developed and maintained scalable web applications using React and Node.js.\nCollaborated with cross-functional teams to define project requirements and architecture.\nOptimized database queries, reducing response times by 30%."
            },
            {
                role: "Web Development Intern",
                company: "Innovate Hub",
                duration: "June 2022 - Dec 2022",
                desc: "Assisted in building responsive user interfaces for client dashboards.\nImplemented automated testing suites to improve code reliability.\nParticipated in daily stand-ups and agile development cycles."
            }
        ];

        const expList = document.getElementById('experience-list');
        expList.innerHTML = '';
        experiences.forEach(exp => {
            const entry = addEntry('experience');
            entry.querySelector('.exp-role').value = exp.role;
            entry.querySelector('.exp-company').value = exp.company;
            entry.querySelector('.exp-duration').value = exp.duration;
            entry.querySelector('.exp-desc').value = exp.desc;
        });

        // Education
        const eduEntry = document.querySelector('#education-list .dynamic-entry');
        if (eduEntry) {
            eduEntry.querySelector('.edu-degree').value = "Bachelor of Science in Computer Science";
            eduEntry.querySelector('.edu-school').value = "State University of Technology";
            eduEntry.querySelector('.edu-year').value = "2019 - 2023";
            eduEntry.querySelector('.edu-gpa').value = "GPA: 3.8/4.0";
        }

        // Projects Section
        const projects = [
            {
                title: "Portfolio Website",
                desc: "Tools: HTML, CSS, JavaScript\nBuilt a personal portfolio website to showcase project work and skills."
            },
            {
                title: "Task Management App",
                desc: "Tools: React, Firebase\nDeveloped a real-time task manager with user authentication and data persistence."
            }
        ];

        const projList = document.getElementById('projects-list');
        projList.innerHTML = '';
        projects.forEach(p => {
            const entry = addEntry('projects');
            entry.querySelector('.proj-title').value = p.title;
            entry.querySelector('.proj-desc').value = p.desc;
        });

        // Internship Projects Section
        const internProjects = [
            {
                title: "Internal Dashboard System",
                desc: "Tools: Vue.js, Flask\nSummary: Built an internal tool for monitoring server health and employee logs."
            }
        ];

        const internProjList = document.getElementById('intern-projects-list');
        if (internProjList) {
            internProjList.innerHTML = '';
            internProjects.forEach(p => {
                const entry = addEntry('intern-projects');
                entry.querySelector('.proj-title').value = p.title;
                entry.querySelector('.proj-desc').value = p.desc;
            });
        }

        // Trigger sync for everything
        document.querySelectorAll('input, textarea').forEach(input => {
            input.dispatchEvent(new Event('input'));
        });

        updateDynamicList('experience');
        updateDynamicList('education');
        updateDynamicList('projects');
        updateDynamicList('intern-projects');
    }

    // Initialize: Try loading, otherwise prefill
    const wasLoaded = loadResumeData();
    if (!wasLoaded) {
        prefillWithSampleData();
    }
});
