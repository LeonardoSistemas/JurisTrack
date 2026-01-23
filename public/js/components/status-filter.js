class StatusFilter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Removemos a div pai para que o grid funcione com display: contents
        this.innerHTML = `
            <div class="row">
                <div class="col-md-3 margin: 10px">
                    <label class="form-label text-muted small fw-bold">Status</label>
                    <select class="form-select bg-light" id="filtroStatus">
                        <option value="">Todos</option>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                    </select>
                </div>
                <div class="col-md-6 margin: 10px">
                    <label class="form-label d-none d-md-block">&nbsp;</label>
                    <input type="text" id="buscaInput" class="form-control"
                        placeholder="Para buscar digite...">
                </div>
            </div>
        `;
    }
}

customElements.define('status-filter', StatusFilter);