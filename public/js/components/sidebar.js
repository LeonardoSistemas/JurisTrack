class AppSidebar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
<div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <button class="mobile-menu-toggle d-md-none" id="sidebarToggle">
          <i class="fas fa-bars"></i> <span class="ms-1 fw-bold">Menu</span>
      </button>
      <div class="bg-white p-3 border-end d-flex flex-column sidebar" id="appSidebar">
        <h4 class="mb-4 text-dark px-2 d-flex justify-content-between align-items-center">
            <span><i class="fas fa-scale-balanced me-2"></i>Juris Track</span>
            <button type="button" class="btn-close d-md-none" id="sidebarClose" aria-label="Close"></button>
        </h4>
        <nav class="nav flex-column flex-grow-1">
            <small class="text-muted text-uppercase fw-bold mb-2 px-2" style="font-size: 0.75rem;">Principal</small>
            <a class="nav-link" href="/dashboard"><i class="fas fa-chart-line"></i> Dashboard</a>
            <a class="nav-link" href="/upload"><i class="fas fa-cloud-upload-alt"></i> Upload / Inicio</a>
            <a class="nav-link" href="/processos"><i class="fas fa-gavel"></i> Processos</a>
            <a class="nav-link" href="/similaridade"><i class="fas fa-clone"></i> Similaridade</a>
            
            <small class="text-muted text-uppercase fw-bold mt-4 mb-2 px-2" style="font-size: 0.75rem;">Cadastros</small>
        
            <a class="nav-link" href="/usuarios">
                <i class="fas fa-users"></i> Usuários
            </a>
            <a class="nav-link" href="/gerenciarPeticao">
                <i class="fas fa-file-contract"></i> Modelos
            </a>
            <a class="nav-link" href="/historico">
                <i class="fas fa-history"></i> Histórico
            </a>
            <a class="nav-link" href="/cidades">
                <i class="fas fa-city"></i> Cidades
            </a>
            <a class="nav-link" href="/estados">
                <i class="fas  fa-map-marker-alt"></i> Estados
            </a>
            <a class="nav-link" href="/comarcas">
                <i class="fas fa-map-signs"></i> Comarcas
            </a>
            <a class="nav-link" href="/tribunais">
                <i class="fas fa-landmark"></i> Tribunais
            </a>
            <a class="nav-link" href="/varas">
                <i class="fas fa-balance-scale"></i> Varas
            </a>
            <a class="nav-link" href="/instancias">
                <i class="fas fa-layer-group"></i> Instâncias
            </a>
            <a class="nav-link" href="/esferas">
                <i class="fas fa-globe"></i> Esferas
            </a>
            <a class="nav-link" href="/fases">
                <i class="fas fa-clock"></i> Fases
            </a>
             <a class="nav-link" href="/moedas">
                <i class="fa-solid fa-money-bill"></i> Moedas
            </a>
            <a class="nav-link" href="/pessoas">
                <i class="fa-duotone fa-regular fa-user"></i> Pessoas
            </a>
            <a class="nav-link" href="/ritos">
                <i class="fa-solid fa-inbox"></i> Ritos
            </a>
            <a class="nav-link" href="/probabilidades">
                <i class="fa-solid fa-rotate"></i> Probabilidades
            </a>
            <a class="nav-link" href="/situacoes">
                <i class="fa-brands fa-stack-overflow"></i> Situações
            </a>
            <a class="nav-link" href="/tipoAcao">
                <i class="fa-solid fa-align-right"></i> Tipo de Ações
            </a>
        </nav>
        
        <div class="mt-auto pt-3 border-top">
             <a class="nav-link text-danger" href="#" id="btnLogout"><i class="fas fa-sign-out-alt"></i> Sair</a>
        </div>
      </div>
    `;

        this.highlightActiveLink();
        this.initMobileToggle();
        this.initLogout();
    }

    initLogout() {
        const btnLogout = this.querySelector("#btnLogout");
        if (btnLogout) {
            btnLogout.addEventListener("click", (e) => {
                e.preventDefault();
                // Limpa todos os dados de sessão
                localStorage.removeItem("juristrack_token");
                localStorage.removeItem("juristrack_userId");
                localStorage.removeItem("juristrack_role");
                localStorage.removeItem("juristrack_tenantId");

                // Redireciona para login
                window.location.href = "/login";
            });
        }
    }

    initMobileToggle() {
        const toggleBtn = this.querySelector('#sidebarToggle');
        const closeBtn = this.querySelector('#sidebarClose');
        const sidebar = this.querySelector('#appSidebar');
        const backdrop = this.querySelector('#sidebarBackdrop');

        if (toggleBtn && sidebar && backdrop) {
            const toggleMenu = () => {
                sidebar.classList.toggle('show');
                backdrop.classList.toggle('show');
            };

            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleMenu();
            });

            if (closeBtn) {
                closeBtn.addEventListener('click', toggleMenu);
            }

            backdrop.addEventListener('click', toggleMenu);
        }
    }

    highlightActiveLink() {
        const currentPath = window.location.pathname;
        const links = this.querySelectorAll('.nav-link');

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
                link.classList.add('active');
                // If it's "Processos", make sure we match exactly or roughly correct
                // For example if href is /processos, and current is /processos/123, it should match?
                // simple equality or startsWith is often enough.
            } else {
                link.classList.remove('active');
            }
        });

        // Special case handling if needed, e.g. /html/processos.html maps to /processos nav item
        if (currentPath.includes('/processos') || currentPath.includes('processos.html') || currentPath.includes('fichaProcesso')) {
            this.setActive('/processos');
        } else if (currentPath.includes('/dashboard') || currentPath.includes('dashboard.html')) {
            this.setActive('/dashboard');
        }
        // Add more specific logic if the generic loop didn't catch it
    }

    setActive(href) {
        const links = this.querySelectorAll('.nav-link');
        links.forEach(link => link.classList.remove('active'));
        const activeLink = this.querySelector(`a[href="${href}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
}

customElements.define('app-sidebar', AppSidebar);
