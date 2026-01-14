function updateFileName() {
    const input = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    if (input.files.length > 0) {
        fileNameDisplay.textContent = input.files[0].name;
        fileNameDisplay.style.color = "#0f172a";
        fileNameDisplay.style.fontWeight = "500";
    } else {
        fileNameDisplay.textContent = "Nenhum arquivo selecionado";
        fileNameDisplay.style.color = "#64748b";
        fileNameDisplay.style.fontWeight = "400";
    }
}

async function uploadFeriados() {
    const input = document.getElementById('fileInput');
    const messageDiv = document.getElementById('message');

    if (input.files.length === 0) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Por favor, selecione um arquivo primeiro.';
        return;
    }

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    messageDiv.className = '';
    messageDiv.style.color = '#3b82f6';
    messageDiv.textContent = 'Enviando e processando...';

    // Recupera o token do LocalStorage (mesma chave usada no login.js)
    const token = localStorage.getItem("juristrack_token");
    if (!token) {
        messageDiv.className = 'error';
        messageDiv.textContent = 'Erro: Token de autenticação ausente. Por favor, faça login novamente.';
        return;
    }

    try {
        const response = await axios.post('/api/feriados/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}` // Inclui o token
            }
        });

        messageDiv.className = 'success';
        messageDiv.textContent = response.data.message || 'Importação realizada com sucesso!';

    } catch (error) {
        console.error(error);
        messageDiv.className = 'error';
        if (error.response && error.response.data && error.response.data.message) {
            messageDiv.textContent = 'Erro: ' + error.response.data.message;
        } else {
            messageDiv.textContent = 'Erro ao conectar com o servidor.';
        }
    }
}

function downloadModelo() {
    // Dados para o modelo
    const dados = [
        { "Data": "2026-12-25", "Descrição": "Natal" },
        { "Data": "2026-05-01", "Descrição": "Dia do Trabalho" }
    ];

    // Gera uma planilha Excel real (.xlsx) para evitar problemas de acentuação (UTF-8/BOM)
    // e garantir que o Excel abra corretamente.
    const ws = XLSX.utils.json_to_sheet(dados);

    // Ajuste de largura das colunas (Opcional, mas bom para UX)
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo Feriados");

    // Faz o download do arquivo binário válido
    XLSX.writeFile(wb, "modelo_feriados.xlsx");
}
