import { read, utils } from 'xlsx';
import moment from 'moment-timezone';
import supabase from '../config/supabase.js';

export const uploadFeriados = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Nenhum arquivo enviado." });
        }

        console.log("[FeriadoController] Recebendo arquivo para importação...");

        // Ler buffer do arquivo (Excel ou CSV)
        const workbook = read(req.file.buffer, { type: 'buffer', cellDates: true });
        // Pega a primeira aba
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Converte para JSON
        const rawData = utils.sheet_to_json(sheet);

        console.log(`[FeriadoController] ${rawData.length} linhas encontradas. Processando...`);

        const feriados = [];

        for (const row of rawData) {
            // Busca dinâmica pelas chaves "Data" e "Descricao" (ignora case)
            const keys = Object.keys(row);
            const dataKey = keys.find(k => k.toLowerCase().includes('data'));
            const descKey = keys.find(k => k.toLowerCase().includes('descri') || k.toLowerCase().includes('name'));

            if (dataKey && descKey) {
                let dataValor = row[dataKey];
                const descricao = row[descKey];

                // Validar e formatar data
                if (dataValor) {
                    const dataFormatada = moment(dataValor).format('YYYY-MM-DD');
                    if (dataFormatada !== 'Invalid date') {
                        feriados.push({
                            data: dataFormatada,
                            descricao: descricao,
                            tipo: 'manual' // Define explicitamente como manual
                        });
                    }
                }
            }
        }

        if (feriados.length === 0) {
            return res.status(400).json({ message: "Nenhum feriado válido encontrado. Verifique se o arquivo possui colunas 'Data' e 'Descrição'." });
        }

        console.log(`[FeriadoController] Tentando inserir ${feriados.length} feriados...`);

        // Inserir no Supabase (Upsert pela chave 'data')
        const { error } = await supabase
            .from('Feriado')
            .upsert(feriados, { onConflict: 'data' });

        if (error) {
            console.error("[FeriadoController] Erro Supabase:", error);
            throw error;
        }

        return res.status(200).json({
            message: `Sucesso! ${feriados.length} feriados foram importados.`,
            details: feriados
        });

    } catch (error) {
        console.error("[FeriadoController] Erro Fatal:", error);
        return res.status(500).json({ message: "Erro interno ao processar feriados.", error: error.message });
    }
};
