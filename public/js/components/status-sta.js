class Statussta extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        // Removemos a div pai para que o grid funcione com display: contents
        this.innerHTML = `
            <div class="row">
                <div class="col-md-3 margin: 5px">
                    <label class="form-label text-muted small fw-bold">Status</label>
                    <select class="form-select bg-light" id="filtroStatus">
                        <option value="">Todos</option>
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                    </select>
                </div>
            </div>
        `;
    }
}

customElements.define('status-sta', Statussta);