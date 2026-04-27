window.templatePresets = [
    {
        id: "corporate",
        name: "Corporate PRO",
        thumb: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&q=80",
        html: `
            <style>html { scroll-behavior: smooth; }</style>\n            <!-- HEADER -->
            <section class="module-section" style="background-color:#ffffff; padding:20px; align-items:center;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; width:100%;">
                    <div class="editable-image-wrapper" style="width:180px;"><img src="https://placehold.co/400x150/ffffff/0ea5e9?text=Corp+PRO" class="logo-img" style="border-radius:4px;"></div>
                    <div style="display:flex; gap:20px;">
                        <a href="#corp-hero" class="editable-text" style="font-weight:600; display:inline-block; color:inherit; text-decoration:none;">Home</a>
                        <a href="#corp-features" class="editable-text" style="font-weight:600; display:inline-block; color:inherit; text-decoration:none;">Services</a>
                        <a href="#corp-contact" class="editable-text" style="font-weight:600; display:inline-block; color:inherit; text-decoration:none;">Contact</a>
                    </div>
                </div>
            </section>

            <!-- HERO -->
            <section id="corp-hero" class="module-section" style="background-color:#f8fafc; min-height:80vh;">
                <div class="bg-overlay"></div>
                <div class="module-content" style="flex-direction:row; align-items:center;">
                    <div class="text-block" style="flex:1;">
                        <h1 class="editable-text" style="font-size:3.5rem; font-weight:800; color:#0f172a; line-height:1.1;">Transform your business with intelligence.</h1>
                        <p class="editable-text" style="font-size:1.2rem; color:#475569; margin:30px 0;">We offer innovative corporate solutions that multiply results and reduce operational costs.</p>
                        <div class="editable-text" style="display:inline-block; padding:15px 30px; background:#0ea5e9; color:#fff; font-weight:bold; border-radius:30px;">Talk to an Expert</div>
                    </div>
                    <div class="editable-image-wrapper" style="flex:1;"><img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800" class="body-img" style="border-radius:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);"></div>
                </div>
            </section>

            <!-- LOGOS -->
            <section class="module-section" style="background-color:#ffffff; padding:40px 0; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; min-height:0;">
                <div class="module-content" style="flex-direction:column; align-items:center;">
                    <p class="editable-text" style="color:#94a3b8; font-weight:bold; letter-spacing:1px;">TRUSTED BY GLOBAL ENTERPRISES</p>
                    <div style="display:flex; gap:40px; margin-top:20px; flex-wrap:wrap; justify-content:center; opacity:0.6;">
                        <div class="editable-image-wrapper"><img src="https://placehold.co/200x80/ffffff/334155?text=Brand+A" style="height:60px;"></div>
                        <div class="editable-image-wrapper"><img src="https://placehold.co/200x80/ffffff/334155?text=Brand+B" style="height:60px;"></div>
                        <div class="editable-image-wrapper"><img src="https://placehold.co/200x80/ffffff/334155?text=Brand+C" style="height:60px;"></div>
                        <div class="editable-image-wrapper"><img src="https://placehold.co/200x80/ffffff/334155?text=Brand+D" style="height:60px;"></div>
                    </div>
                </div>
            </section>

            <!-- FEATURES -->
            <section id="corp-features" class="module-section" style="background-color:#f1f5f9; padding:80px 0;">
                <div class="module-content" style="flex-direction:column;">
                    <div class="text-block" style="text-align:center; max-width:600px; margin:0 auto 60px;">
                        <h1 class="editable-text" style="color:#0f172a;">What we deliver</h1>
                        <p class="editable-text" style="color:#64748b;">Our platform offers essential tools for your company to dominate the market.</p>
                    </div>
                    <div style="display:flex; gap:30px; flex-wrap:wrap;">
                        <!-- Feature 1 -->
                        <div style="flex:1; background:#ffffff; padding:40px; border-radius:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                            <div class="editable-text" style="font-size:2rem; color:#0ea5e9; margin-bottom:20px;">🛡️</div>
                            <h3 class="editable-text" style="font-size:1.5rem; margin-bottom:15px; color:#1e293b;">Maximum Security</h3>
                            <p class="editable-text" style="color:#475569;">Data protection with end-to-end encryption and full compliance.</p>
                        </div>
                        <!-- Feature 2 -->
                        <div style="flex:1; background:#ffffff; padding:40px; border-radius:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                            <div class="editable-text" style="font-size:2rem; color:#0ea5e9; margin-bottom:20px;">⚡</div>
                            <h3 class="editable-text" style="font-size:1.5rem; margin-bottom:15px; color:#1e293b;">High Performance</h3>
                            <p class="editable-text" style="color:#475569;">Fast and optimized systems ensuring zero slowdowns in your workflows.</p>
                        </div>
                        <!-- Feature 3 -->
                        <div style="flex:1; background:#ffffff; padding:40px; border-radius:12px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);">
                            <div class="editable-text" style="font-size:2rem; color:#0ea5e9; margin-bottom:20px;">📈</div>
                            <h3 class="editable-text" style="font-size:1.5rem; margin-bottom:15px; color:#1e293b;">Scalability</h3>
                            <p class="editable-text" style="color:#475569;">Architecture ready to scale as your enterprise expands globally.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- STATS -->
            <section class="module-section" style="background-image:linear-gradient(135deg, #0ea5e9, #2563eb); color:white;">
                <div class="module-content" style="display:flex; justify-content:space-around; align-items:center; text-align:center;">
                    <div>
                        <h1 class="editable-text" style="font-size:4rem; margin-bottom:0;">500+</h1>
                        <p class="editable-text">Projects Delivered</p>
                    </div>
                    <div>
                        <h1 class="editable-text" style="font-size:4rem; margin-bottom:0;">98%</h1>
                        <p class="editable-text">Client Satisfaction</p>
                    </div>
                    <div>
                        <h1 class="editable-text" style="font-size:4rem; margin-bottom:0;">2M+</h1>
                        <p class="editable-text">Revenue Generated</p>
                    </div>
                </div>
            </section>

            <!-- FOOTER -->
            <footer id="corp-contact" class="module-section" style="background-color:#0f172a; color:#cbd5e1; margin-bottom:0;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:2;">
                        <h3 class="editable-text" style="color:white; margin-bottom:20px;">Corp PRO</h3>
                        <p class="editable-text" style="max-width:300px;">Transforming enterprises through digital innovation. Headquartered globally.</p>
                    </div>
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:white; margin-bottom:20px;">Useful Links</h4>
                        <p class="editable-text" style="margin-bottom:10px;">About Us</p>
                        <p class="editable-text" style="margin-bottom:10px;">Careers</p>
                        <p class="editable-text" style="margin-bottom:10px;">Terms of Use</p>
                    </div>
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:white; margin-bottom:20px;">Contact</h4>
                        <p class="editable-text" style="margin-bottom:10px;">contact@corppro.com</p>
                        <p class="editable-text" style="margin-bottom:10px;">1-800-123-4567</p>
                    </div>
                </div>
            </footer>
        `
    },
    {
        id: "global-commission",
        name: "Institution: Global Commission",
        thumb: "https://images.unsplash.com/photo-1529108190281-9a4f620bc2d8?w=500&q=80",
        html: `
            <style>html { scroll-behavior: smooth; }</style>\n            <!-- TOP BAR -->
            <section class="module-section" style="background-color:#003399; padding:5px 20px; min-height:0;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:center;">
                    <div style="display:flex; gap:15px; font-size:0.75rem; color:#cbd5e1;">
                        <span class="editable-text">Official site of the Global Executive Commission</span>
                        <span class="editable-text">How do you know you're on a secure site?</span>
                    </div>
                    <div style="display:flex; gap:15px; font-size:0.8rem; color:white;">
                        <span class="editable-text">EN - English</span>
                        <span class="editable-text">Accessibility</span>
                    </div>
                </div>
            </section>

            <!-- MAIN HEADER -->
            <section class="module-section" style="background-color:#ffffff; padding:20px; border-bottom:1px solid #e2e8f0; align-items:center;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; width:100%;">
                    <div style="display:flex; align-items:center; gap:20px;">
                        <span class="editable-text" style="font-size:3rem; color:#003399;">🏛️</span>
                        <div>
                            <h2 class="editable-text" style="color:#003399; margin:0; font-family:'Arial', sans-serif; font-weight:900; letter-spacing:0.5px;">Executive Commission</h2>
                            <p class="editable-text" style="color:#64748b; font-size:0.9rem; margin:0;">Central Office for Transnational Policies</p>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:15px;">
                        <div style="display:flex; gap:20px; font-weight:600; font-size:0.95rem; color:#334155;">
                            <a href="#gc-strategy" class="editable-text" style="text-decoration:none; color:inherit;">Strategy and Policies</a>
                            <a href="#gc-work" class="editable-text" style="text-decoration:none; color:inherit;">The Commission at Work</a>
                            <a href="#gc-funding" class="editable-text" style="text-decoration:none; color:inherit;">Funding</a>
                            <a href="#gc-news" class="editable-text" style="text-decoration:none; color:inherit;">News and Documents</a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- SUB NAVIGATION TABS -->
            <section id="gc-funding" class="module-section" style="background-color:#f8fafc; padding:0; border-bottom:3px solid #ffcc00; min-height:0;">
                <div class="module-content" style="flex-direction:row; gap:0;">
                    <div class="editable-text" style="padding:15px 30px; background:#ffffff; color:#003399; font-weight:bold; border-right:1px solid #e2e8f0; cursor:pointer;">Priorities for 2025-2029</div>
                    <div class="editable-text" style="padding:15px 30px; color:#475569; font-weight:600; border-right:1px solid #e2e8f0; cursor:pointer;">Global Green Deal</div>
                    <div class="editable-text" style="padding:15px 30px; color:#475569; font-weight:600; border-right:1px solid #e2e8f0; cursor:pointer;">Technology Regulation (AI Act)</div>
                </div>
            </section>

            <!-- COMPLEX HERO -->
            <section id="gc-strategy" class="module-section" style="background-color:#ffffff; padding:50px 0;">
                <div class="module-content" style="flex-direction:row; gap:40px; align-items:flex-start;">
                    <!-- Main News Story -->
                    <div style="flex:2;">
                        <span class="editable-text" style="color:#003399; font-weight:bold; font-size:0.85rem; text-transform:uppercase;">President's Highlight · April 24</span>
                        <h1 class="editable-text" style="font-size:2.5rem; font-weight:800; color:#1e293b; line-height:1.2; margin:15px 0;">Historic Agreement on the New Digital Market Law Finalized by Parliament</h1>
                        <p class="editable-text" style="font-size:1.1rem; color:#475569; line-height:1.6; margin-bottom:20px;">The Council adopted a common position to regulate internet gatekeepers, aiming to ensure fairer, more open digital markets with strict protection for free competition across Member States.</p>
                        
                        <div style="display:flex; gap:20px; margin-bottom:30px;">
                            <div class="editable-text" style="padding:10px 20px; background:#003399; color:white; font-weight:bold; border-radius:4px; font-size:0.9rem;">Read Press Release</div>
                            <div class="editable-text" style="padding:10px 20px; background:#f1f5f9; color:#0f172a; font-weight:bold; border-radius:4px; font-size:0.9rem;">View Official Document (PDF)</div>
                        </div>
                        
                        <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1541882198-46ba08061e38?w=900" class="body-img" style="border-radius:4px; height:350px;"></div>
                    </div>
                    
                    <!-- Sidebar Links & Quick Actions -->
                    <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:25px;">
                        <h3 class="editable-text" style="font-size:1.2rem; color:#003399; margin-bottom:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px;">Services by Topic</h3>
                        
                        <ul style="list-style:none; padding:0; margin:0;">
                            <li style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px dashed #cbd5e1;">
                                <h4 class="editable-text" style="font-size:1rem; color:#0f172a; margin-bottom:5px;">Taxes and Customs</h4>
                                <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin:0;">VAT rules, intra-community trade, customs tariffs.</p>
                            </li>
                            <li style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px dashed #cbd5e1;">
                                <h4 class="editable-text" style="font-size:1rem; color:#0f172a; margin-bottom:5px;">Justice and Fundamental Rights</h4>
                                <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin:0;">Common asylum system, rule of law, GDPR.</p>
                            </li>
                            <li style="margin-bottom:15px; padding-bottom:15px; border-bottom:1px dashed #cbd5e1;">
                                <h4 class="editable-text" style="font-size:1rem; color:#0f172a; margin-bottom:5px;">Public Health</h4>
                                <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin:0;">Medicines Agency, Health Data Space.</p>
                            </li>
                            <li>
                                <h4 class="editable-text" style="font-size:1rem; color:#0f172a; margin-bottom:5px;">Funding and Tenders</h4>
                                <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin:0;">Opportunities and cohesion funds for enterprises.</p>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- PUBLICATION DIRECTORY -->
            <section id="gc-news" class="module-section" style="background-color:#f1f5f9; padding:60px 0;">
                <div class="module-content" style="flex-direction:column;">
                    <h2 class="editable-text" style="font-size:1.8rem; color:#1e293b; margin-bottom:30px;">Guidelines and Legal Repository (Last 48h)</h2>
                    
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                        <!-- Table Header -->
                        <div style="display:flex; background:#0f172a; color:white; padding:15px 20px; font-weight:bold; font-size:0.9rem;">
                            <div class="editable-text" style="flex:1;">DOC Reference</div>
                            <div class="editable-text" style="flex:3;">Title / Document Syllabus</div>
                            <div class="editable-text" style="flex:1;">Council</div>
                            <div class="editable-text" style="flex:1;">Adopted Date</div>
                            <div class="editable-text" style="width:80px; text-align:center;">Action</div>
                        </div>
                        
                        <!-- Row 1 -->
                        <div style="display:flex; padding:15px 20px; border-bottom:1px solid #e2e8f0; align-items:center;">
                            <div class="editable-text" style="flex:1; color:#003399; font-family:monospace; font-weight:bold;">COM(2026) 112</div>
                            <div class="editable-text" style="flex:3; color:#334155; padding-right:20px;">Directive on environmental impact assessments in rare earth mining complexes.</div>
                            <div class="editable-text" style="flex:1; color:#64748b; font-size:0.85rem;">Environment</div>
                            <div class="editable-text" style="flex:1; color:#64748b; font-size:0.85rem;">APR 24, 2026</div>
                            <div class="editable-text" style="width:80px; text-align:center; color:#0ea5e9; font-weight:bold; cursor:pointer;">[PDF]</div>
                        </div>
                        
                        <!-- Row 2 -->
                        <div style="display:flex; padding:15px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; align-items:center;">
                            <div class="editable-text" style="flex:1; color:#003399; font-family:monospace; font-weight:bold;">REG/2026/089</div>
                            <div class="editable-text" style="flex:3; color:#334155; padding-right:20px;">Regulation for cross-border coordination of AI systems in health sectors.</div>
                            <div class="editable-text" style="flex:1; color:#64748b; font-size:0.85rem;">Technology</div>
                            <div class="editable-text" style="flex:1; color:#64748b; font-size:0.85rem;">APR 23, 2026</div>
                            <div class="editable-text" style="width:80px; text-align:center; color:#0ea5e9; font-weight:bold; cursor:pointer;">[PDF]</div>
                        </div>

                        <!-- Row 3 -->
                        <div style="display:flex; padding:15px 20px; align-items:center;">
                            <div class="editable-text" style="flex:1; color:#003399; font-family:monospace; font-weight:bold;">DEC/2026/401</div>
                            <div class="editable-text" style="flex:3; color:#334155; padding-right:20px;">Decision on the adequate level of personal data protection granted by regional laws.</div>
                            <div class="editable-text" style="flex:1; color:#64748b; font-size:0.85rem;">Justice</div>
                            <div class="editable-text" style="flex:1; color:#64748b; font-size:0.85rem;">APR 22, 2026</div>
                            <div class="editable-text" style="width:80px; text-align:center; color:#0ea5e9; font-weight:bold; cursor:pointer;">[PDF]</div>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- COMMISSIONERS PROFILES -->
            <section id="gc-work" class="module-section" style="background-color:#ffffff; padding:60px 0; border-top:1px solid #e2e8f0;">
                <div class="module-content" style="flex-direction:column;">
                    <h2 class="editable-text" style="font-size:1.8rem; color:#1e293b; margin-bottom:30px; text-align:center;">Members of the College (2025-2029)</h2>
                    <div style="display:flex; gap:30px; justify-content:center;">
                        <div style="text-align:center; max-width:250px;">
                            <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400" class="body-img" style="border-radius:50%; width:150px; height:150px; object-fit:cover; margin:0 auto 15px; border:3px solid #ffcc00; padding:3px;"></div>
                            <h4 class="editable-text" style="font-size:1.1rem; color:#0f172a; margin-bottom:5px;">Ursula von der L.</h4>
                            <p class="editable-text" style="font-size:0.9rem; color:#003399; font-weight:bold;">President</p>
                            <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin-top:10px;">General Political Guidelines and Appointments.</p>
                        </div>
                        <div style="text-align:center; max-width:250px;">
                            <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400" class="body-img" style="border-radius:50%; width:150px; height:150px; object-fit:cover; margin:0 auto 15px; border:3px solid #e2e8f0; padding:3px;"></div>
                            <h4 class="editable-text" style="font-size:1.1rem; color:#0f172a; margin-bottom:5px;">Josep B. Fontelles</h4>
                            <p class="editable-text" style="font-size:0.9rem; color:#003399; font-weight:bold;">High Representative</p>
                            <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin-top:10px;">Foreign Policy and Collective Security.</p>
                        </div>
                        <div style="text-align:center; max-width:250px;">
                            <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400" class="body-img" style="border-radius:50%; width:150px; height:150px; object-fit:cover; margin:0 auto 15px; border:3px solid #e2e8f0; padding:3px;"></div>
                            <h4 class="editable-text" style="font-size:1.1rem; color:#0f172a; margin-bottom:5px;">Margrethe Vestager</h4>
                            <p class="editable-text" style="font-size:0.9rem; color:#003399; font-weight:bold;">Vice-President</p>
                            <p class="editable-text" style="font-size:0.85rem; color:#64748b; margin-top:10px;">Fair Competition and Digital Transition.</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- FOOTER -->
            <section class="module-section" style="background-color:#f8fafc; padding:40px 0; border-top:1px solid #cbd5e1;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; font-size:0.85rem; color:#475569;">
                    <div style="flex:1;">
                        <span class="editable-text" style="font-size:2rem; color:#003399;">🏛️ Global Commission</span>
                        <p class="editable-text" style="margin-top:15px; max-width:250px;">This site is the central inter-institutional platform serving as the direct link for public communication.</p>
                    </div>
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:#1e293b; margin-bottom:15px; font-weight:bold;">Discoveries</h4>
                        <p class="editable-text" style="margin-bottom:8px; cursor:pointer;">How Institutions work</p>
                        <p class="editable-text" style="margin-bottom:8px; cursor:pointer;">Priorities and Achievements</p>
                        <p class="editable-text" style="margin-bottom:8px; cursor:pointer;">The Legislative Process</p>
                    </div>
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:#1e293b; margin-bottom:15px; font-weight:bold;">Contact Us</h4>
                        <p class="editable-text" style="margin-bottom:8px; cursor:pointer;">Local Service Offices</p>
                        <p class="editable-text" style="margin-bottom:8px; cursor:pointer;">Toll-Free: 1-800 67 89</p>
                        <p class="editable-text" style="margin-bottom:8px; cursor:pointer;">Press Inquiry Forms</p>
                    </div>
                </div>
            </section>
        `
    },
    {
        id: "international-court",
        name: "Institution: International Court",
        thumb: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=500&q=80",
        html: `
            <style>html { scroll-behavior: smooth; }</style>\n            <!-- HEADER -->
            <section class="module-section" style="background-color:#1c1917; padding:15px 30px; border-bottom:4px solid #78350f;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column;">
                        <h2 class="editable-text" style="margin:0; font-family:'Georgia', serif; font-size:2.5rem; color:#facc15; font-weight:normal; letter-spacing:1px;">SUPREME INTERNATIONAL COURT</h2>
                        <span class="editable-text" style="color:#a8a29e; font-size:0.9rem; font-family:'Georgia', serif; font-style:italic;">The Permanent Court of International Arbitration - The Hague</span>
                    </div>
                    <div style="display:flex; gap:30px; color:#f5f5f4; font-family:'Arial', sans-serif; font-size:0.95rem; font-weight:bold;">
                        <a href="#ic-court" class="editable-text" style="text-decoration:none; color:#facc15; text-transform:uppercase; border-bottom:2px solid #facc15; padding-bottom:5px;">The Court</a>
                        <a href="#ic-cases" class="editable-text" style="text-decoration:none; color:inherit; text-transform:uppercase;">Pending Cases</a>
                        <a href="#ic-jurisprudence" class="editable-text" style="text-decoration:none; color:inherit; text-transform:uppercase;">Jurisprudence</a>
                        <a href="#ic-publications" class="editable-text" style="text-decoration:none; color:inherit; text-transform:uppercase;">Publications</a>
                    </div>
                </div>
            </section>

            <!-- SUB HEADER DATA BAR -->
            <section class="module-section" style="background-color:#292524; padding:10px 30px; min-height:0;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; font-family:monospace; font-size:0.8rem; color:#d6d3d1;">
                    <span class="editable-text">Next Plenary Session: May 12, 2026</span>
                    <div style="display:flex; gap:20px;">
                        <span class="editable-text">Official Language: EN / FR</span>
                        <span class="editable-text">Case no. 402 ongoing</span>
                    </div>
                </div>
            </section>

            <!-- HERO -> LATEST RULING -->
            <section id="ic-jurisprudence" class="module-section" style="background-color:#fafaf9; padding:60px 0; border-bottom:1px solid #d6d3d1;">
                <div class="module-content" style="flex-direction:row; gap:50px;">
                    <div style="flex:3;">
                        <span class="editable-text" style="background:#78350f; color:white; padding:5px 10px; font-family:'Arial', sans-serif; font-size:0.8rem; font-weight:bold; letter-spacing:1px;">HISTORIC RULING HIGHLIGHT</span>
                        <h1 class="editable-text" style="font-family:'Georgia', serif; font-size:3rem; color:#1c1917; margin:20px 0; line-height:1.2;">Delimitation of the Continental Shelf and Joint Exploitation Agreements</h1>
                        <p class="editable-text" style="font-family:'Georgia', serif; font-size:1.2rem; color:#57534e; line-height:1.8; margin-bottom:30px;">The Court concluded that the equidistance principle must be mitigated in cases of severe coastal indentations, applying the principles of equity and proportionality established by the International Convention.</p>
                        <div style="display:flex; gap:20px; font-family:'Arial', sans-serif;">
                            <div class="editable-text" style="background:#1c1917; color:white; padding:12px 25px; font-weight:bold; cursor:pointer; font-size:0.9rem;">Download Full Judgment (PDF)</div>
                            <div class="editable-text" style="border:1px solid #1c1917; color:#1c1917; padding:12px 25px; font-weight:bold; cursor:pointer; font-size:0.9rem;">View Press Summary</div>
                        </div>
                    </div>
                    <div class="editable-image-wrapper" style="flex:2;">
                        <img src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800" class="body-img" style="border-radius:2px; filter:grayscale(30%); box-shadow:0 10px 30px rgba(0,0,0,0.1);">
                    </div>
                </div>
            </section>

            <!-- COURT CALENDAR / DOCKET -->
            <section id="ic-cases" class="module-section" style="background-color:#ffffff; padding:70px 0;">
                <div class="module-content" style="flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; border-bottom:2px solid #1c1917; padding-bottom:15px;">
                        <h2 class="editable-text" style="font-family:'Georgia', serif; font-size:2rem; color:#1c1917; margin:0;">Hearing Docket (Public Document)</h2>
                        <span class="editable-text" style="font-family:'Arial', sans-serif; color:#78350f; font-weight:bold; text-decoration:underline;">View Complete File</span>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:0;">
                        <!-- Docket Row 1 -->
                        <div style="display:flex; padding:25px; border:1px solid #e7e5e4; border-bottom:none; background:#fafaf9; transition:0.2s;">
                            <div style="flex:1;">
                                <p class="editable-text" style="font-family:monospace; color:#b45309; font-weight:bold; font-size:1rem; margin:0;">CASE 2026-11</p>
                                <p class="editable-text" style="font-family:'Arial', sans-serif; font-size:0.9rem; color:#57534e; margin-top:5px;">Started: Oct 02 2025</p>
                            </div>
                            <div style="flex:3; padding:0 20px;">
                                <h3 class="editable-text" style="font-family:'Georgia', serif; font-size:1.3rem; color:#1c1917; margin:0 0 10px 0;">Application of Incidental Provisional Measures: Commercial Dispute</h3>
                                <p class="editable-text" style="font-family:'Arial', sans-serif; font-size:1rem; color:#444; line-height:1.6; margin:0;">Oral hearing of the requesting Republic in response to the objections filed in memorandum by the other party concerning navigation rights.</p>
                            </div>
                            <div style="flex:1; text-align:right;">
                                <span class="editable-text" style="display:inline-block; padding:5px 10px; border:1px solid #78350f; color:#78350f; font-family:'Arial', sans-serif; font-size:0.8rem; font-weight:bold;">MAY 15 2026 - HEARINGS</span>
                            </div>
                        </div>

                        <!-- Docket Row 2 -->
                        <div style="display:flex; padding:25px; border:1px solid #e7e5e4; transition:0.2s;">
                            <div style="flex:1;">
                                <p class="editable-text" style="font-family:monospace; color:#b45309; font-weight:bold; font-size:1rem; margin:0;">CASE 2026-04</p>
                                <p class="editable-text" style="font-family:'Arial', sans-serif; font-size:0.9rem; color:#57534e; margin-top:5px;">Started: Jan 18 2026</p>
                            </div>
                            <div style="flex:3; padding:0 20px;">
                                <h3 class="editable-text" style="font-family:'Georgia', serif; font-size:1.3rem; color:#1c1917; margin:0 0 10px 0;">Administrative Issues Regarding Biosecurity Treaties</h3>
                                <p class="editable-text" style="font-family:'Arial', sans-serif; font-size:1rem; color:#444; line-height:1.6; margin:0;">Public reading of the summary of the advisory opinions requested and voted by the special committee of the chamber.</p>
                            </div>
                            <div style="flex:1; text-align:right;">
                                <span class="editable-text" style="display:inline-block; padding:5px 10px; background:#1c1917; color:white; font-family:'Arial', sans-serif; font-size:0.8rem; font-weight:bold;">MAY 22 2026 - RULING</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- JUDGES & ADMINISTRATION -->
            <section id="ic-court" class="module-section" style="background-color:#f5f5f4; padding:80px 0;">
                <div class="module-content" style="flex-direction:row; gap:40px;">
                    <div style="flex:1;">
                        <h2 class="editable-text" style="font-family:'Georgia', serif; font-size:1.8rem; color:#1c1917; margin-bottom:20px;">Composition of the Court</h2>
                        <p class="editable-text" style="font-family:'Arial', sans-serif; font-size:1rem; color:#57534e; line-height:1.6; margin-bottom:30px;">The Court is composed of 15 judges, elected for nine-year terms by the General Assembly and the United Nations Security Council.</p>
                        
                        <div style="display:flex; flex-direction:column; gap:15px;">
                            <!-- Judge Profile -->
                            <div style="display:flex; align-items:center; gap:20px; background:white; padding:15px; border:1px solid #e7e5e4;">
                                <div class="editable-image-wrapper" style="width:60px; height:60px;"><img src="https://images.unsplash.com/photo-1556157382-97eda2d62296?w=200" class="body-img" style="border-radius:50%; width:100%; height:100%; object-fit:cover; border:2px solid #d6d3d1;"></div>
                                <div>
                                    <h4 class="editable-text" style="font-family:'Arial', sans-serif; margin:0; font-size:1.1rem; color:#1c1917;">H.E. Judge Nawaf Salam</h4>
                                    <span class="editable-text" style="font-family:'Georgia', serif; font-size:0.9rem; color:#78350f; font-style:italic;">President of the Court</span>
                                </div>
                            </div>
                            <!-- Judge Profile -->
                            <div style="display:flex; align-items:center; gap:20px; background:white; padding:15px; border:1px solid #e7e5e4;">
                                <div class="editable-image-wrapper" style="width:60px; height:60px;"><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200" class="body-img" style="border-radius:50%; width:100%; height:100%; object-fit:cover; border:2px solid #d6d3d1;"></div>
                                <div>
                                    <h4 class="editable-text" style="font-family:'Arial', sans-serif; margin:0; font-size:1.1rem; color:#1c1917;">H.E. Judge Julia Sebutinde</h4>
                                    <span class="editable-text" style="font-family:'Georgia', serif; font-size:0.9rem; color:#78350f; font-style:italic;">Vice-President of the Court</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="flex:1; border-left:1px solid #d6d3d1; padding-left:40px;">
                        <h2 class="editable-text" style="font-family:'Georgia', serif; font-size:1.8rem; color:#1c1917; margin-bottom:20px;">Basic Resources</h2>
                        <ul style="list-style-type:square; font-family:'Arial', sans-serif; color:#78350f; padding-left:20px; font-size:1.1rem;">
                            <li style="margin-bottom:15px;"><span class="editable-text" style="color:#292524;">Official Court Statute and Declarations</span></li>
                            <li style="margin-bottom:15px;"><span class="editable-text" style="color:#292524;">Rules of Court and Practice Directions</span></li>
                            <li style="margin-bottom:15px;"><span class="editable-text" style="color:#292524;">Manual Guides for Agents and States</span></li>
                            <li style="margin-bottom:15px;"><span class="editable-text" style="color:#292524;">Assembly Resolutions for Moot Cases</span></li>
                            <li style="margin-bottom:15px;"><span class="editable-text" style="color:#292524;">Employability Directory and Legal Internships</span></li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- FOOTER -->
            <section class="module-section" style="background-color:#1c1917; padding:40px 0; color:#a8a29e; font-family:'Arial', sans-serif; font-size:0.85rem;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between;">
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:white; margin-bottom:15px; font-family:'Georgia', serif;">Palais de la Paix</h4>
                        <p class="editable-text" style="margin-bottom:5px;">Carnegieplein 2</p>
                        <p class="editable-text" style="margin-bottom:5px;">2517 KJ The Hague</p>
                        <p class="editable-text" style="margin-bottom:5px;">The Netherlands</p>
                    </div>
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:white; margin-bottom:15px; font-family:'Georgia', serif;">Contact</h4>
                        <p class="editable-text" style="margin-bottom:5px;">+31 (0)70 302 23 23</p>
                        <p class="editable-text" style="margin-bottom:5px;">information@icj-cij.org</p>
                    </div>
                    <div style="flex:1; text-align:right;">
                        <p class="editable-text" style="display:inline-block; border:1px solid #78350f; color:#facc15; padding:10px 20px; font-weight:bold;">PUBLIC INFORMATION REGISTRY</p>
                        <p class="editable-text" style="margin-top:10px;">@ 2026 Permanent Court</p>
                    </div>
                </div>
            </section>
        `
    },
    {
        id: "human-rights-observatory",
        name: "NGO: Crisis Observatory",
        thumb: "/uploads/ngo_crisis_thumb.png",
        html: `
            <style>html { scroll-behavior: smooth; }</style>\n            <!-- SENSITIVE ALERT TOP HEADER -->
            <section class="module-section" style="background-color:#991b1b; padding:10px; min-height:0;">
                <div class="module-content" style="flex-direction:row; justify-content:center;">
                    <p class="editable-text" style="color:white; font-family:'Arial', sans-serif; font-weight:bold; font-size:0.85rem; letter-spacing:0.5px; margin:0; text-align:center;">⚠ CONTENT WARNING: Reports on this platform describe severe fundamental rights violations, humanitarian crises, and armed conflict victims.</p>
                    <span class="editable-text" style="color:#fca5a5; font-size:0.85rem; cursor:pointer; text-decoration:underline; font-weight:bold;">[ Hide Alert ]</span>
                </div>
            </section>

            <!-- MAIN HEADER -->
            <section class="module-section" style="background-color:#171717; padding:25px; border-bottom:1px solid #404040;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:center;">
                    <div style="display:flex; flex-direction:column;">
                        <h2 class="editable-text" style="margin:0; font-family:'Arial', sans-serif; font-size:2rem; color:#f5f5f5; font-weight:900; text-transform:uppercase; letter-spacing:-0.5px;">Crisis Observatory</h2>
                        <span class="editable-text" style="color:#a3a3a3; font-size:0.85rem; font-family:'Arial', sans-serif;">Independent Monitoring of Immigration and Systemic Aggressions</span>
                    </div>
                    <div style="display:flex; gap:25px; color:#d4d4d4; font-family:'Arial', sans-serif; font-size:0.95rem; font-weight:bold;">
                        <a href="#ngo-research" class="editable-text" style="text-decoration:none; color:inherit;">Field Research</a>
                        <a href="#ngo-advocacy" class="editable-text" style="text-decoration:none; color:inherit;">Advocacy</a>
                        <a href="#ngo-zones" class="editable-text" style="text-decoration:none; color:inherit;">Monitored Zones</a>
                        <a href="#ngo-donate" class="editable-text" style="text-decoration:none; border:2px solid #ef4444; padding:5px 15px; color:#ef4444;">Donate Now</a>
                    </div>
                </div>
            </section>

            <!-- DASHBOARD HERO SENSITIVE DATA -->
            <section id="ngo-advocacy" class="module-section" style="background-color:#0a0a0a; padding:60px 0; color:white;">
                <div class="module-content" style="flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; border-bottom:1px solid #262626; padding-bottom:20px;">
                        <div style="max-width:700px;">
                            <span class="editable-text" style="color:#ef4444; font-weight:bold; font-size:0.9rem; font-family:monospace; margin-bottom:10px; display:inline-block;">GLOBAL REPORT - Q2 2026</span>
                            <h1 class="editable-text" style="font-family:'Arial', sans-serif; font-size:3.5rem; font-weight:900; line-height:1; margin:0 0 20px 0;">The Invisible Tragedy on Maritime Routes</h1>
                            <p class="editable-text" style="font-size:1.1rem; color:#a3a3a3; line-height:1.7;">The current convergence of political crises in the east has caused an unprecedented migration shock. We analyze hundreds of testimonies from refugees facing illegal push-back policies in border seas.</p>
                        </div>
                        <div style="text-align:right;">
                            <p class="editable-text" style="color:#737373; font-family:monospace; margin-bottom:10px; font-size:0.85rem;">Current Reception Status in EU Zones:</p>
                            <h2 class="editable-text" style="color:#ef4444; font-size:4rem; font-weight:900; line-height:0.8; margin:0;">CRITICAL</h2>
                            <div class="editable-text" style="margin-top:20px; display:inline-block; border:1px solid #ef4444; color:#ef4444; padding:10px 20px; font-family:'Arial', sans-serif; font-weight:bold; font-size:0.9rem; cursor:pointer;">DOWNLOAD FULL DOSSIER</div>
                        </div>
                    </div>

                    <!-- STATISTICS DATA CARDS -->
                    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:20px; width:100%;">
                        <div style="background:#171717; padding:25px; border-left:3px solid #ef4444;">
                            <p class="editable-text" style="color:#a3a3a3; font-family:monospace; font-size:0.8rem; margin-bottom:5px;">REJECTION CASES</p>
                            <h3 class="editable-text" style="font-size:2rem; font-weight:900; margin:0; color:#f5f5f5;">14,502</h3>
                            <p class="editable-text" style="color:#ef4444; font-size:0.8rem; font-family:monospace; margin-top:10px;">▲ +12% vs. 2025</p>
                        </div>
                        <div style="background:#171717; padding:25px; border-left:3px solid #facc15;">
                            <p class="editable-text" style="color:#a3a3a3; font-family:monospace; font-size:0.8rem; margin-bottom:5px;">OVERCROWDED CAMPS</p>
                            <h3 class="editable-text" style="font-size:2rem; font-weight:900; margin:0; color:#f5f5f5;">38</h3>
                            <p class="editable-text" style="color:#a3a3a3; font-size:0.8rem; font-family:monospace; margin-top:10px;">Mediterranean Shores</p>
                        </div>
                        <div style="background:#171717; padding:25px; border-left:3px solid #ef4444;">
                            <p class="editable-text" style="color:#a3a3a3; font-family:monospace; font-size:0.8rem; margin-bottom:5px;">MINOR VICTIMS</p>
                            <h3 class="editable-text" style="font-size:2rem; font-weight:900; margin:0; color:#f5f5f5;">> 32%</h3>
                            <p class="editable-text" style="color:#a3a3a3; font-size:0.8rem; font-family:monospace; margin-top:10px;">Maximum Vulnerability</p>
                        </div>
                        <div style="background:#171717; padding:25px; border-left:3px solid #3b82f6;">
                            <p class="editable-text" style="color:#a3a3a3; font-family:monospace; font-size:0.8rem; margin-bottom:5px;">REQUIRED FUNDS</p>
                            <h3 class="editable-text" style="font-size:2rem; font-weight:900; margin:0; color:#f5f5f5;">€1.2B</h3>
                            <p class="editable-text" style="color:#a3a3a3; font-size:0.8rem; font-family:monospace; margin-top:10px;">Budget under EU debate</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- EXPOSE INVESTIGATION REPORT -->
            <section id="ngo-research" class="module-section" style="background-color:#171717; padding:80px 0; border-top:1px solid #262626;">
                <div class="module-content" style="flex-direction:row; gap:60px; align-items:center;">
                    <div class="editable-image-wrapper" style="flex:1;">
                        <img src="https://images.unsplash.com/photo-1542157585-ef20bfcce579?w=800" class="body-img" style="filter:grayscale(100%) contrast(1.2); border:1px solid #404040; border-radius:4px;">
                    </div>
                    <div style="flex:1;">
                        <h2 class="editable-text" style="font-family:'Arial', sans-serif; font-size:2rem; color:#f5f5f5; font-weight:bold; margin-bottom:20px;">The Structural Abandonment by the Migration Pact</h2>
                        <p class="editable-text" style="font-size:1.1rem; color:#d4d4d4; line-height:1.7; margin-bottom:20px; font-family:'Georgia', serif;">Laws passed under the veil of "national security" have practically generated a drastic erosion of the right to asylum. Our field investigators' analysis points to flagrant violations at borders where guidelines are intentionally misinterpreted.</p>
                        <p class="editable-text" style="font-size:1.1rem; color:#d4d4d4; line-height:1.7; margin-bottom:20px; font-family:'Georgia', serif;">Reports confiscated at the Hungarian border last Wednesday indicate that private militias are being outsourced to deal with groups of defectors, escaping the jurisdiction of the international court.</p>
                        <p class="editable-text" style="font-size:1rem; color:#a3a3a3; line-height:1.7; font-family:'Arial', sans-serif; border-left:3px solid #ef4444; padding-left:15px; background:#0a0a0a; padding:15px;">"The legislative and court infrastructure does not match what happens on the ground. Border agencies must not act as summary courts, sentencing refugees to the sea under secret emergency decrees." <br><br>— Chief Investigator, Report 14b</p>
                    </div>
                </div>
            </section>

            <!-- CRISIS MAP AND REGIONS -->
            <section id="ngo-zones" class="module-section" style="background-color:#0a0a0a; padding:80px 0; border-top:1px solid #262626;">
                <div class="module-content" style="flex-direction:row; gap:40px;">
                    <div style="flex:1; display:flex; flex-direction:column;">
                        <h2 class="editable-text" style="font-family:'Arial', sans-serif; font-size:1.8rem; color:#f5f5f5; margin-bottom:15px;">Active High-Risk Zones</h2>
                        <ul style="list-style:none; padding:0; margin:0; color:#d4d4d4;">
                            <li style="padding:15px; border-bottom:1px solid #262626; display:flex; justify-content:space-between;">
                                <span class="editable-text" style="font-weight:bold; color:#ef4444;">Balkan Corridor (Level 5)</span>
                                <span class="editable-text" style="font-family:monospace; color:#a3a3a3;">Closed</span>
                            </li>
                            <li style="padding:15px; border-bottom:1px solid #262626; display:flex; justify-content:space-between; background:#171717;">
                                <span class="editable-text" style="font-weight:bold; color:#facc15;">Central Med. (Level 4)</span>
                                <span class="editable-text" style="font-family:monospace; color:#a3a3a3;">Naval Patrol</span>
                            </li>
                            <li style="padding:15px; border-bottom:1px solid #262626; display:flex; justify-content:space-between;">
                                <span class="editable-text" style="font-weight:bold; color:#3b82f6;">Calais Border (Level 3)</span>
                                <span class="editable-text" style="font-family:monospace; color:#a3a3a3;">High Tension</span>
                            </li>
                        </ul>
                    </div>
                    <div style="flex:2; background:#171717; border:1px solid #404040; padding:30px; text-align:center;">
                        <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800" class="body-img" style="filter:grayscale(100%) opacity(0.5); object-fit:cover; height:200px; width:100%;"></div>
                        <p class="editable-text" style="color:#737373; font-family:monospace; margin-top:20px;">[ Off-line Geo-Spatial Mapping System. Restricted to Tier-2 Donors ]</p>
                    </div>
                </div>
            </section>

            <!-- FOOTER -->
            <section id="ngo-donate" class="module-section" style="background-color:#000000; padding:40px 0; border-top:2px solid #991b1b;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; font-family:'Arial', sans-serif;">
                    <div style="flex:1;">
                        <h4 class="editable-text" style="color:#ef4444; margin-bottom:10px; font-weight:900;">CRISIS OBSERVATORY</h4>
                        <p class="editable-text" style="color:#737373; font-size:0.85rem; max-width:250px;">An international NGO of field investigators documenting structural aggressions for global justice.</p>
                    </div>
                    <div style="flex:1; color:#737373; font-size:0.85rem;">
                        <p class="editable-text" style="margin-bottom:5px;">Headquarters: Geneva, Switzerland</p>
                        <p class="editable-text" style="margin-bottom:5px;">Encrypted Comm Protocols: Available</p>
                    </div>
                    <div style="flex:1; text-align:right;">
                        <div class="editable-text" style="background:#ef4444; color:white; padding:10px 20px; display:inline-block; font-weight:bold; cursor:pointer;">SUBMIT ANONYMOUS TIP</div>
                    </div>
                </div>
            </section>
        `
    },
    {
        id: "saas-dark",
        name: "SaaS Dark Tech",
        thumb: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=500&q=80",
        html: `
            <style>html { scroll-behavior: smooth; }</style>\n            <!-- NAVBAR -->
            <section class="module-section" style="background-color:rgba(15,23,42,0.8); backdrop-filter:blur(10px); position:sticky; top:0; z-index:500; min-height:70px;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:center;">
                    <h2 class="editable-text text-white" style="margin:0; font-weight:800; font-size:1.5rem; letter-spacing:1px; color:#c084fc;">NEXUS<span style="color:white;">.API</span></h2>
                    <div style="display:flex; gap:30px; color:#cbd5e1;">
                        <a href="#saas-docs" class="editable-text" style="text-decoration:none; color:inherit;">Documentation</a>
                        <a href="#saas-pricing" class="editable-text" style="text-decoration:none; color:inherit;">Pricing</a>
                        <a href="#saas-changelog" class="editable-text" style="text-decoration:none; color:inherit;">Changelog</a>
                    </div>
                    <a href="#saas-dashboard" class="editable-text" style="text-decoration:none; background:#a855f7; color:white; padding:8px 20px; border-radius:6px; font-weight:bold;">Dashboard</a>
                </div>
            </section>

            <!-- HERO DARK -->
            <section id="saas-dashboard" class="module-section" style="background-color:#020617; overflow:hidden; position:relative; min-height:85vh;">
                <div class="bg-overlay" style="background:radial-gradient(circle at 50% -20%, #4c1d95 0%, transparent 70%);"></div>
                <div class="module-content" style="flex-direction:column; text-align:center; justify-content:center; padding-top:80px;">
                    <div class="editable-text" style="border:1px solid #334155; color:#94a3b8; padding:5px 15px; border-radius:30px; font-size:0.9rem; margin-bottom:30px; background:rgba(255,255,255,0.05);">✨ Nexus v3.5 Released! Multi-Region Support.</div>
                    <h1 class="editable-text text-white" style="font-size:5rem; font-weight:900; background:linear-gradient(to right, #e879f9, #a855f7, #6366f1); -webkit-background-clip:text; color:transparent; text-shadow:none; line-height:1.1;">The Backend of the Future,<br>Ready Today.</h1>
                    <p class="editable-text" style="font-size:1.5rem; color:#94a3b8; max-width:700px; margin:30px auto;">The definitive serverless infrastructure for exceptional products. Integrated, resilient, insanely scalable.</p>
                    
                    <div style="display:flex; gap:20px; justify-content:center; margin-top:20px; z-index:10;">
                        <div class="editable-text" style="padding:15px 40px; background:#8b5cf6; color:white; border-radius:8px; font-weight:bold; font-size:1.1rem; box-shadow:0 0 25px rgba(139,92,246,0.5);">Start Building Free</div>
                        <div class="editable-text" style="padding:15px 40px; background:transparent; color:#e2e8f0; border-radius:8px; font-weight:bold; font-size:1.1rem; border:1px solid #334155;">View Demo</div>
                    </div>
                </div>
            </section>

            <!-- METRIC AND CODE DISPLAY -->
            <section id="saas-changelog" class="module-section" style="background-color:#0f172a; border-top:1px solid #1e293b; padding:80px 0;">
                <div class="module-content" style="display:flex; justify-content:center; align-items:center;">
                    <div style="background:#020617; border:1px solid #334155; border-radius:12px; padding:25px; width:800px; box-shadow:0 25px 50px rgba(0,0,0,0.5); font-family:monospace; color:#38bdf8; font-size:1.1rem; text-align:left;">
                        <p style="color:#64748b; margin-bottom:15px;">// Initialize Nexus Client</p>
                        <p><span style="color:#f472b6;">import</span> { Nexus } <span style="color:#f472b6;">from</span> '@nexus/core';</p>
                        <br>
                        <p><span style="color:#f472b6;">const</span> client = <span style="color:#f472b6;">new</span> Nexus(process.env.NEXUS_KEY);</p>
                        <br>
                        <p style="color:#64748b;">// Insanely fast real-time sync</p>
                        <p><span style="color:#f472b6;">await</span> client.sync().watch('users', (data) => {</p>
                        <p>&nbsp;&nbsp;console.log("New User Connected:", data);</p>
                        <p>});</p>
                    </div>
                </div>
            </section>

            <!-- INFRASTRUCTURE GRAPHICS -->
            <section class="module-section" style="background-color:#020617; padding:90px 0;">
                <div class="module-content" style="flex-direction:row; align-items:center; gap:50px;">
                    <div style="flex:1;">
                        <h2 class="editable-text text-white" style="font-size:2.5rem; margin-bottom:20px;">Global Network. <br>Distributed Edge.</h2>
                        <p class="editable-text" style="color:#94a3b8; line-height:1.7; font-size:1.1rem; margin-bottom:30px;">We have POPs distributed in over 35 global locations. Your code and data will run adjacent to your users, reducing ping aggressively and improving throughput.</p>
                        <div class="editable-text" style="display:inline-block; font-weight:bold; color:#a855f7; border-bottom:1px solid #a855f7;">View Region Map -></div>
                    </div>
                    <div style="flex:1; background:#0f172a; border:1px solid #1e293b; border-radius:12px; padding:40px; display:flex; flex-direction:column; gap:20px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:10px;">
                            <span class="editable-text text-white">US-East (N. Virginia)</span>
                            <span class="editable-text" style="color:#10b981; font-family:monospace;">8ms</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:10px;">
                            <span class="editable-text text-white">EU-Central (Frankfurt)</span>
                            <span class="editable-text" style="color:#10b981; font-family:monospace;">12ms</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:10px;">
                            <span class="editable-text text-white">SA-East (São Paulo)</span>
                            <span class="editable-text" style="color:#10b981; font-family:monospace;">15ms</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="editable-text text-white">AP-Northeast (Tokyo)</span>
                            <span class="editable-text" style="color:#10b981; font-family:monospace;">22ms</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- FEATURES CARDS -->
            <section id="saas-docs" class="module-section" style="background-color:#0f172a; padding:100px 0;">
                <div class="module-content" style="flex-direction:column;">
                    <h2 class="editable-text text-white" style="font-size:3rem; text-align:center; margin-bottom:60px;">Everything you need in one API.</h2>
                    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:30px; width:100%;">
                        <div style="background:#020617; border:1px solid #1e293b; padding:35px; border-radius:12px; transition:0.3s; box-shadow:inset 0 2px 0 #8b5cf6;">
                            <h3 class="editable-text text-white" style="font-size:1.5rem; margin-bottom:15px;">RT Database</h3>
                            <p class="editable-text" style="color:#94a3b8; line-height:1.6;">Managed real-time SQL and NoSQL databases. Less than 10ms latency guaranteed across Europe and the Americas.</p>
                        </div>
                        <div style="background:#020617; border:1px solid #1e293b; padding:35px; border-radius:12px; box-shadow:inset 0 2px 0 #ec4899;">
                            <h3 class="editable-text text-white" style="font-size:1.5rem; margin-bottom:15px;">Magic Auth</h3>
                            <p class="editable-text" style="color:#94a3b8; line-height:1.6;">OAuth 2.0, Passkeys and biometrics perfectly abstracted inside a 2 kilobyte SDK.</p>
                        </div>
                        <div style="background:#020617; border:1px solid #1e293b; padding:35px; border-radius:12px; box-shadow:inset 0 2px 0 #06b6d4;">
                            <h3 class="editable-text text-white" style="font-size:1.5rem; margin-bottom:15px;">Edge Functions</h3>
                            <p class="editable-text" style="color:#94a3b8; line-height:1.6;">Run your code firmly attached to your end users. Full support for Node.js, Python and Go.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- PRICING -->
            <section id="saas-pricing" class="module-section" style="background-color:#020617; padding:100px 0;">
                <div class="module-content" style="flex-direction:column; align-items:center;">
                    <h2 class="editable-text text-white" style="font-size:3rem; margin-bottom:50px; text-align:center;">Transparent Pricing, by Devs for Devs.</h2>
                    <div style="display:flex; gap:30px; max-width:900px; width:100%;">
                        <div style="flex:1; background:#0f172a; padding:40px; border-radius:16px; border:1px solid #334155; text-align:center;">
                            <h3 class="editable-text text-white" style="font-size:1.5rem; margin-bottom:10px;">Hobby</h3>
                            <p class="editable-text" style="font-size:3rem; font-weight:800; color:#fff;">Free</p>
                            <p class="editable-text" style="color:#94a3b8; margin:20px 0;">1 GB Database<br>10k Edge Invocations<br>Community Support</p>
                            <div class="editable-text" style="background:#334155; color:white; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:30px;">Deploy Now</div>
                        </div>
                        <div style="flex:1; background:linear-gradient(180deg, #2e1065, #1e1b4b); padding:40px; border-radius:16px; border:1px solid #a855f7; text-align:center; transform:scale(1.05); box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                            <div class="editable-text" style="background:#a855f7; color:white; font-size:0.8rem; font-weight:bold; padding:4px 10px; border-radius:20px; display:inline-block; margin-bottom:15px;">MOST POPULAR</div>
                            <h3 class="editable-text text-white" style="font-size:1.5rem; margin-bottom:10px;">Pro</h3>
                            <p class="editable-text" style="font-size:3rem; font-weight:800; color:#a855f7;">$29<span style="font-size:1rem; color:#94a3b8;">/mo</span></p>
                            <p class="editable-text" style="color:#cbd5e1; margin:20px 0;">No API limits<br>Scalable Databases<br>Priority Ticket queue<br>Daily backups</p>
                            <div class="editable-text" style="background:#8b5cf6; color:white; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; margin-top:20px;">Subscribe Pro</div>
                        </div>
                    </div>
                </div>
            </section>
            
            <!-- FOOTER -->
            <section class="module-section" style="background-color:#0f172a; padding:50px 0; border-top:1px solid #1e293b;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:flex-start;">
                    <div style="flex:2;">
                        <h2 class="editable-text text-white" style="margin:0; font-weight:800; font-size:1.5rem; letter-spacing:1px; color:#c084fc;">NEXUS<span style="color:white;">.API</span></h2>
                        <p class="editable-text" style="color:#64748b; margin-top:10px; max-width:300px;">The tooling you need to conquer the web. Nexus delivers the best APIs tightly coupled with Vercel, Netlify and AWS.</p>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <h4 class="editable-text text-white">Resources</h4>
                        <span class="editable-text" style="color:#94a3b8;">Documentation</span>
                        <span class="editable-text" style="color:#94a3b8;">CLI and SDKs</span>
                        <span class="editable-text" style="color:#94a3b8;">Open Source Examples</span>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:10px;">
                        <h4 class="editable-text text-white">Company</h4>
                        <span class="editable-text" style="color:#94a3b8;">About Us</span>
                        <span class="editable-text" style="color:#94a3b8;">Careers</span>
                        <span class="editable-text" style="color:#94a3b8;">Blog</span>
                    </div>
                </div>
            </section>
        `
    },
    {
        id: "global-justice-legislation",
        name: "Institution: Global Justice & Legislation",
        thumb: "/uploads/institution_justice_thumb.png",
        html: `
            <style>html { scroll-behavior: smooth; }</style>\n            <!-- TOP NOTIFIER BAR -->
            <section class="module-section" style="background-color:#0f172a; padding:8px 30px; min-height:0;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; color:#94a3b8; font-size:0.75rem; font-family:'Arial', sans-serif;">
                    <span class="editable-text">Official Global Legislative & Judiciary Public Record</span>
                    <span class="editable-text">English (UK) | Advanced Search | Contact Authority</span>
                </div>
            </section>

            <!-- MAIN HEADER -->
            <section class="module-section" style="background-color:#ffffff; padding:25px 30px; border-bottom:3px solid #b45309;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:20px;">
                        <span class="editable-text" style="font-size:3.5rem; color:#0f172a;">⚖️</span>
                        <div style="display:flex; flex-direction:column;">
                            <h2 class="editable-text" style="margin:0; font-family:'Georgia', serif; font-size:2.2rem; color:#0f172a; line-height:1.1;">Global Justice & Legislation</h2>
                            <span class="editable-text" style="color:#64748b; font-size:0.95rem; font-family:'Arial', sans-serif; letter-spacing:0.5px;">The Supreme Judiciary and Legislative Council combined records</span>
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:15px; text-align:right;">
                        <div style="display:flex; gap:20px; font-weight:bold; font-family:'Arial', sans-serif; font-size:0.9rem; justify-content:flex-end;">
                            <a href="#gjl-court" class="editable-text" style="text-decoration:none; color:#0f172a;">Court Rulings</a>
                            <a href="#gjl-laws" class="editable-text" style="text-decoration:none; color:#0f172a;">Ratified Laws</a>
                            <a href="#gjl-debates" class="editable-text" style="text-decoration:none; color:#0f172a;">Plenary Debates</a>
                            <a href="#gjl-committees" class="editable-text" style="text-decoration:none; color:#0f172a;">Committees</a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- TABS MODULE -->
            <section id="gjl-debates" class="module-section" style="background-color:#f8fafc; padding:0; border-bottom:1px solid #e2e8f0; min-height:0;">
                <div class="module-content" style="flex-direction:row; gap:0;">
                    <div class="editable-text" style="padding:15px 30px; background:#b45309; color:white; font-weight:bold; border-right:1px solid #e2e8f0; cursor:pointer;">Latest Ratified Acts</div>
                    <div class="editable-text" style="padding:15px 30px; color:#475569; font-weight:600; border-right:1px solid #e2e8f0; cursor:pointer;">Scheduled Public Hearings</div>
                    <div class="editable-text" style="padding:15px 30px; color:#475569; font-weight:600; border-right:1px solid #e2e8f0; cursor:pointer;">Active Judiciary Cases</div>
                </div>
            </section>

            <!-- SPLIT BOARD HERO -->
            <section id="gjl-court" class="module-section" style="background-color:#ffffff; padding:50px 0;">
                <div class="module-content" style="flex-direction:row; gap:40px;">
                    <!-- Highlight Legal Event -->
                    <div style="flex:2;">
                        <span class="editable-text" style="color:#b45309; font-weight:bold; font-family:monospace; font-size:0.9rem;">ENACTMENT HIGHLIGHT // MAY 2026</span>
                        <h1 class="editable-text" style="font-family:'Georgia', serif; font-size:2.8rem; color:#0f172a; margin:15px 0; line-height:1.2;">Legislative Act 2026-X on Global Data Securities and AI Governance</h1>
                        <p class="editable-text" style="font-family:'Georgia', serif; font-size:1.15rem; color:#475569; line-height:1.7; margin-bottom:25px;">The general council has successfully passed the unified code for AI and distributed securities, heavily reforming the international civil framework and establishing the new Data Supreme Authority to handle upcoming juridical conflicts across all member nations.</p>
                        
                        <div style="display:flex; gap:15px;">
                            <div class="editable-text" style="background:#0f172a; color:white; padding:12px 25px; font-weight:bold; font-family:'Arial', sans-serif; font-size:0.9rem; cursor:pointer;">Download Ratified Bill (PDF)</div>
                            <div class="editable-text" style="border:1px solid #cbd5e1; color:#0f172a; padding:12px 25px; font-weight:bold; font-family:'Arial', sans-serif; font-size:0.9rem; cursor:pointer;">View Plenary Vote Tally</div>
                        </div>

                        <div style="margin-top:40px; display:flex; gap:20px;">
                            <div style="flex:1; border-top:2px solid #b45309; padding-top:15px;">
                                <h4 class="editable-text" style="font-family:'Georgia', serif; color:#0f172a; margin:0 0 10px 0;">Passed: 412 Yea, 10 Nay</h4>
                                <span class="editable-text" style="font-size:0.85rem; color:#64748b; font-family:'Arial', sans-serif;">Absolute Majority Reached</span>
                            </div>
                            <div style="flex:1; border-top:2px solid #0f172a; padding-top:15px;">
                                <h4 class="editable-text" style="font-family:'Georgia', serif; color:#0f172a; margin:0 0 10px 0;">Effective: Sep 01, 2026</h4>
                                <span class="editable-text" style="font-size:0.85rem; color:#64748b; font-family:'Arial', sans-serif;">Enforcement Date Confirmed</span>
                            </div>
                        </div>
                    </div>

                    <!-- Sidebar Judiciary Notice -->
                    <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; padding:30px;">
                        <h3 class="editable-text" style="font-family:'Georgia', serif; font-size:1.4rem; color:#b45309; margin-top:0; border-bottom:2px solid #e2e8f0; padding-bottom:15px;">Pending Supreme Sentences</h3>
                        
                        <div style="margin-top:20px; padding-bottom:15px; border-bottom:1px dashed #cbd5e1;">
                            <span class="editable-text" style="font-family:monospace; color:#0f172a; font-weight:bold; font-size:0.85rem;">DOCKET #994 - ANTI-TRUST</span>
                            <h4 class="editable-text" style="font-family:'Arial', sans-serif; font-size:1rem; color:#334155; margin:10px 0;">MegaSystems Inc. vs Regional Labor Commission</h4>
                            <span class="editable-text" style="font-size:0.85rem; color:#64748b;">Scheduled Ruling: June 5</span>
                        </div>
                        
                        <div style="margin-top:15px; padding-bottom:15px; border-bottom:1px dashed #cbd5e1;">
                            <span class="editable-text" style="font-family:monospace; color:#0f172a; font-weight:bold; font-size:0.85rem;">DOCKET #1022 - BORDER LAW</span>
                            <h4 class="editable-text" style="font-family:'Arial', sans-serif; font-size:1rem; color:#334155; margin:10px 0;">Republic of Genovia Maritime Extent Disputes</h4>
                            <span class="editable-text" style="font-size:0.85rem; color:#64748b;">Scheduled Ruling: June 12</span>
                        </div>

                        <div class="editable-text" style="margin-top:20px; text-align:center; color:#b45309; font-weight:bold; cursor:pointer; font-size:0.9rem;">View Full Calendar →</div>
                    </div>
                </div>
            </section>

            <!-- ULTRA DENSE DOCKET TABLE -->
            <section id="gjl-laws" class="module-section" style="background-color:#f1f5f9; padding:60px 0; border-top:1px solid #e2e8f0;">
                <div class="module-content" style="flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h2 class="editable-text" style="font-family:'Georgia', serif; font-size:1.8rem; color:#0f172a; margin:0;">Active Legislative Bills Registry</h2>
                        <div style="display:flex; gap:10px;">
                            <span class="editable-text" style="background:white; border:1px solid #cbd5e1; padding:5px 10px; font-size:0.8rem; font-weight:bold;">Filter by Topic</span>
                            <span class="editable-text" style="background:white; border:1px solid #cbd5e1; padding:5px 10px; font-size:0.8rem; font-weight:bold;">Filter by Status</span>
                        </div>
                    </div>

                    <div style="background:white; border:1px solid #cbd5e1; box-shadow:0 10px 15px -3px rgba(0,0,0,0.05);">
                        <!-- Table Headers -->
                        <div style="display:flex; background:#0f172a; color:white; padding:15px 20px; font-family:'Arial', sans-serif; font-size:0.85rem; font-weight:bold;">
                            <div class="editable-text" style="flex:1;">ID / BILL REF</div>
                            <div class="editable-text" style="flex:4;">TITLE & LEGISLATIVE SUMMARY</div>
                            <div class="editable-text" style="flex:2;">COMMITTEE</div>
                            <div class="editable-text" style="flex:1;">STATUS</div>
                            <div class="editable-text" style="width:100px; text-align:center;">ACTIONS</div>
                        </div>

                        <!-- Table Row 1 -->
                        <div style="display:flex; padding:20px; border-bottom:1px solid #e2e8f0; align-items:center;">
                            <div class="editable-text" style="flex:1; font-family:monospace; color:#b45309; font-weight:bold; font-size:0.9rem;">HR-4052</div>
                            <div style="flex:4; padding-right:20px;">
                                <h4 class="editable-text" style="margin:0 0 5px 0; font-family:'Georgia', serif; font-size:1.1rem; color:#0f172a;">Energy grid sovereign interlink amendment</h4>
                                <p class="editable-text" style="margin:0; font-size:0.9rem; color:#64748b; line-height:1.4;">Proposition to standardize grid voltages and cross-border power sharing capabilities between members.</p>
                            </div>
                            <div class="editable-text" style="flex:2; font-size:0.9rem; color:#334155; font-weight:bold;">Infrastructure & Energy</div>
                            <div class="editable-text" style="flex:1;"><span style="background:#fef08a; color:#854d0e; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">IN REVIEW</span></div>
                            <div class="editable-text" style="width:100px; text-align:center; color:#0ea5e9; font-weight:bold; font-size:0.85rem; cursor:pointer;">[ READ ]</div>
                        </div>

                        <!-- Table Row 2 -->
                        <div style="display:flex; padding:20px; border-bottom:1px solid #e2e8f0; align-items:center; background:#f8fafc;">
                            <div class="editable-text" style="flex:1; font-family:monospace; color:#b45309; font-weight:bold; font-size:0.9rem;">SB-0991</div>
                            <div style="flex:4; padding-right:20px;">
                                <h4 class="editable-text" style="margin:0 0 5px 0; font-family:'Georgia', serif; font-size:1.1rem; color:#0f172a;">Fiscal Transparency and Anti-Evasion Acts</h4>
                                <p class="editable-text" style="margin:0; font-size:0.9rem; color:#64748b; line-height:1.4;">Mandates global reporting standards for offshore corporate entities exceeding 50M in gross annual revenue.</p>
                            </div>
                            <div class="editable-text" style="flex:2; font-size:0.9rem; color:#334155; font-weight:bold;">Finance & Economy</div>
                            <div class="editable-text" style="flex:1;"><span style="background:#bbf7d0; color:#166534; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">VOTING STAGE</span></div>
                            <div class="editable-text" style="width:100px; text-align:center; color:#0ea5e9; font-weight:bold; font-size:0.85rem; cursor:pointer;">[ READ ]</div>
                        </div>

                        <div style="padding:15px; text-align:center; cursor:pointer; background:#f1f5f9; color:#64748b; font-size:0.9rem; font-weight:bold;">
                            <span class="editable-text">Load Additional Records...</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- MEMBERS AND JURISDICTION -->
            <section id="gjl-committees" class="module-section" style="background-color:#ffffff; padding:80px 0;">
                <div class="module-content" style="flex-direction:row; gap:50px;">
                    <div style="flex:1;">
                        <h2 class="editable-text" style="font-family:'Georgia', serif; font-size:1.8rem; color:#0f172a; margin-bottom:25px;">Judiciary Leadership Profiles</h2>
                        <div style="display:flex; flex-direction:column; gap:20px;">
                            <div style="display:flex; gap:20px; align-items:center;">
                                <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400" class="body-img" style="border-radius:50%; width:80px; height:80px; object-fit:cover; border:2px solid #cbd5e1;"></div>
                                <div>
                                    <h4 class="editable-text" style="margin:0 0 5px 0; font-size:1.1rem; color:#0f172a;">Hon. Arthur Kingsley</h4>
                                    <span class="editable-text" style="color:#b45309; font-size:0.9rem; font-family:'Georgia', serif;">Chief Justice of the Supreme Court</span>
                                </div>
                            </div>
                            <div style="display:flex; gap:20px; align-items:center;">
                                <div class="editable-image-wrapper"><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400" class="body-img" style="border-radius:50%; width:80px; height:80px; object-fit:cover; border:2px solid #cbd5e1;"></div>
                                <div>
                                    <h4 class="editable-text" style="margin:0 0 5px 0; font-size:1.1rem; color:#0f172a;">Hon. Elena Rostova</h4>
                                    <span class="editable-text" style="color:#b45309; font-size:0.9rem; font-family:'Georgia', serif;">Head of the Economic Chambers</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="flex:1; border-left:1px solid #e2e8f0; padding-left:50px;">
                        <h2 class="editable-text" style="font-family:'Georgia', serif; font-size:1.8rem; color:#0f172a; margin-bottom:25px;">Statutory Code Resources</h2>
                        <p class="editable-text" style="font-family:'Arial', sans-serif; font-size:1rem; color:#475569; line-height:1.6; margin-bottom:20px;">Quick access to procedural rules, ethical frameworks, and the constitution guidelines applied to state parties during open hearings.</p>
                        <ul style="list-style-type:none; padding:0; margin:0; font-family:'Arial', sans-serif; color:#0ea5e9;">
                            <li style="margin-bottom:10px; cursor:pointer;" class="editable-text">→ Official Procedural Guidelines</li>
                            <li style="margin-bottom:10px; cursor:pointer;" class="editable-text">→ Anti-Corruption Ethics Charter</li>
                            <li style="margin-bottom:10px; cursor:pointer;" class="editable-text">→ Archive of Public Transcripts</li>
                            <li style="cursor:pointer;" class="editable-text">→ Registry of Elected Representatives</li>
                        </ul>
                    </div>
                </div>
            </section>

            <!-- FOOTER -->
            <section class="module-section" style="background-color:#0f172a; padding:50px 0; border-top:5px solid #b45309;">
                <div class="module-content" style="flex-direction:row; justify-content:space-between; font-family:'Arial', sans-serif; color:#94a3b8; font-size:0.85rem;">
                    <div style="flex:1;">
                        <h3 class="editable-text" style="color:white; margin-bottom:15px; font-family:'Georgia', serif; font-size:1.3rem;">GLOBAL JUSTICE & LEGISLATION</h3>
                        <p class="editable-text" style="max-width:300px; line-height:1.6;">The integrated portal for transparency, democracy, and public hearings representation for the global state network.</p>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                        <span class="editable-text" style="color:white; font-weight:bold; margin-bottom:5px;">Main Offices</span>
                        <span class="editable-text">International Legislation Hall, BLDG 4</span>
                        <span class="editable-text">700 Judicial Boulevard</span>
                        <span class="editable-text">Capital District, CD 10001</span>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:8px; text-align:right;">
                        <span class="editable-text" style="color:white; font-weight:bold; margin-bottom:5px;">Contact Info</span>
                        <span class="editable-text">Phone: +1 (800) 555-0199</span>
                        <span class="editable-text">Clerk: clerk@globaljustice.gov</span>
                        <span class="editable-text" style="margin-top:15px;">© 2026 Council. All Rights Reserved.</span>
                    </div>
                </div>
            </section>
        `
    }
];
