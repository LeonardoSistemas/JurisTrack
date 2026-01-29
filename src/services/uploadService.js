import supabase from "../config/supabase.js";
import {
  generateSafeFilename,
  getCurrentSaoPauloTimestamp,
  notifyN8NWebhook,
} from "../utils/utils.js";
import { injectTenant, withTenantFilter } from "../repositories/tenantScope.js";
import { ValidationError } from "../utils/authErrors.js";
import { logError, logInfo, logWarn } from "../utils/logger.js";

const Bucket_Name = "teste";


// --- FUNÇÕES upload_Documentos / IA --

export const uploadFileToStorage = async (
  file,
  numProcesso,
  processoId,
  tenantId,
  ignorarN8N = false
) => {
  if (!tenantId) {
    throw new ValidationError(
      "tenantId é obrigatório para realizar upload com segregação."
    );
  }
  
  const safeName = generateSafeFilename(file.originalname);
  
  // LÓGICA DE PASTA:
  // Se tiver número do processo, organiza em subpasta. Caso contrário, fica na raiz do tenant.
  let filePath = safeName;
  if (numProcesso && numProcesso.trim() !== "" && numProcesso !== "undefined") {
      const pastaSegura = numProcesso.trim().replace(/[^a-zA-Z0-9.-]/g, "_"); 
      filePath = `${pastaSegura}/${safeName}`;
  }
  
  // Prefixo do Tenant para garantir isolamento
  filePath = `${tenantId}/${filePath}`;

  // 1. Upload para o Storage
  const { error: uploadError } = await supabase.storage
    .from(Bucket_Name)
    .upload(filePath, file.buffer, {
      cacheControl: "3600",
      upsert: false, // Evita sobrescrever arquivos com mesmo nome
      contentType: file.mimetype,
    });

  if (uploadError) {
      if (uploadError.statusCode === "409" || (uploadError.message && uploadError.message.includes("already exists"))) {
          const error = new Error("Arquivo já existe no sistema (Duplicidade).");
          error.statusCode = "409";
          throw error;
      }
      throw uploadError;
  }
  
  logInfo("upload.storage.success", "Upload salvo no storage", {
    tenantId,
    filePath,
    mimeType: file.mimetype,
    tamanho: file.size,
  });

  // 2. Obter URL Pública
  const { data: publicUrlData } = supabase.storage
    .from(Bucket_Name)
    .getPublicUrl(filePath);

  // 3. Inserir Registro no Banco de Dados
  const localDateString = getCurrentSaoPauloTimestamp();
  
  // DEFINE O STATUS:
  // - Se ignorarN8N é true (Ficha Processo) -> 'doc_processo'
  // - Se ignorarN8N é false (Tela Upload IA) -> 'pendente' (aguardando N8N)
  const statusInicial = ignorarN8N ? "doc_processo" : "pendente";

  const documentData = {
    nome_arquivo: safeName,
    url_publica: publicUrlData.publicUrl,
    data_upload: localDateString,
    status: statusInicial, 
    processo_id: processoId || null,
    tipo: file.mimetype, 
    tamanho: file.size
  };

  const { data: insertData, error: insertError } = await supabase
    .from("upload_Documentos")
    .insert([injectTenant(documentData, tenantId)])
    .select();

  if (insertError) {
      // Rollback: remove do storage se falhar no banco para não deixar arquivo órfão
      await supabase.storage.from(Bucket_Name).remove([filePath]);
      throw insertError;
  }
  
  logInfo("upload.db.insert_success", "Documento registrado", {
    tenantId,
    processoId,
    documentId: insertData?.[0]?.id,
    fileName: safeName,
    status: statusInicial
  });

  // 4. Acionar Webhook N8N (Somente se NÃO for para ignorar)
  if (!ignorarN8N && insertData && insertData.length > 0) {
    try {
        notifyN8NWebhook(insertData[0].id, tenantId);
        logInfo("upload.n8n.triggered", "Webhook N8N acionado", { tenantId });
    } catch (n8nError) {
        logError("upload.n8n.error", "Falha ao acionar N8N", { error: n8nError });
    }
  } else {
    logInfo("upload.n8n.skipped", "N8N ignorado (upload simples)", { tenantId });
  }

  return { fileName: safeName, publicUrl: publicUrlData.publicUrl };
};

export const deleteDocument = async (id, tenantId) => {
  const { data: doc, error: fetchError } = await withTenantFilter(
    "upload_Documentos",
    tenantId
  )
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!doc) {
    throw new Error("Documento não encontrado.");
  }

  // Remove do Storage se tiver URL
  if (doc.url_publica) {
    try {
      const bucketUrlPart = `/${Bucket_Name}/`;
      const urlParts = doc.url_publica.split(bucketUrlPart);

      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1]);

        logInfo("upload.storage.delete", "Removendo do storage", { tenantId, storagePath });

        const { error: storageError } = await supabase.storage
          .from(Bucket_Name)
          .remove([storagePath]);

        if (storageError) {
          logWarn("upload.storage.delete_failed", "Erro ao remover arquivo físico", { error: storageError });
        }
      }
    } catch (err) {
      logError("upload.storage.path_error", "Erro ao processar caminho", { error: err });
    }
  }

  // Remove do Banco
  const { error: deleteError } = await withTenantFilter(
    "upload_Documentos",
    tenantId
  )
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;
  
  return true;
};

// Lista documentos de um processo específico (usado na Ficha do Processo)
export const listDocumentsByProcess = async (processoId, tenantId) => {
    const { data, error } = await withTenantFilter(
      "upload_Documentos",
      tenantId
    )
      .select("*")
      .eq("processo_id", processoId)
      .order("data_upload", { ascending: false });
  
    if (error) throw error;
    return data;
  };

// Lista documentos GERAIS para a tela de Upload (IA)
// ALTERAÇÃO: Filtra apenas status 'pendente' ou 'processado'
export const listAllDocuments = async (tenantId) => {
  const { data, error } = await withTenantFilter(
    "upload_Documentos",
    tenantId
  )
    .select("*")
    // FILTRO IMPORTANTE:
    // Exclui 'doc_processo' (anexos simples).
    // Mostra apenas o que está sendo processado pela IA ou já terminou.
    .in("status", ["pendente", "processado"]) 
    .order("data_upload", { ascending: false });

  if (error) throw error;
  return data;
};


// --- NOVAS FUNÇÕES: TABELA PROCESSO_DOC (FICHA DO PROCESSO) ---

export const uploadFileToProcessoDoc = async (
  file,
  numProcesso,
  processoId,
  tenantId
) => {
  if (!tenantId) {
    throw new ValidationError("tenantId é obrigatório.");
  }

  const safeName = generateSafeFilename(file.originalname);
  
  // Estratégia de pastas: tenantId / numProcesso (safe) / nomeArquivo
  let filePath = safeName;
  if (numProcesso && numProcesso.trim() !== "" && numProcesso !== "undefined") {
      const pastaSegura = numProcesso.trim().replace(/[^a-zA-Z0-9.-]/g, "_"); 
      filePath = `${pastaSegura}/${safeName}`;
  }
  
  filePath = `${tenantId}/${filePath}`;

  // 1. Upload para o Storage
  const { error: uploadError } = await supabase.storage
    .from(Bucket_Name)
    .upload(filePath, file.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.mimetype,
    });

  if (uploadError) {
      if (uploadError.statusCode === "409" || (uploadError.message && uploadError.message.includes("already exists"))) {
          const error = new Error("Arquivo já existe no sistema (Duplicidade).");
          error.statusCode = "409";
          throw error;
      }
      throw uploadError;
  }

  // 2. Obter URL Pública
  const { data: publicUrlData } = supabase.storage
    .from(Bucket_Name)
    .getPublicUrl(filePath);

  // 3. Inserir na tabela processo_Doc
  const localDateString = getCurrentSaoPauloTimestamp();
  
  const documentData = {
    nome_arquivo: safeName,
    url_publica: publicUrlData.publicUrl,
    data_upload: localDateString,
    status: 'anexado',
    processo_id: processoId || null,
    tipo: file.mimetype, 
    tamanho: file.size
  };

  const { data: insertData, error: insertError } = await supabase
    .from("processo_Doc")
    .insert([injectTenant(documentData, tenantId)])
    .select();

  if (insertError) {
      await supabase.storage.from(Bucket_Name).remove([filePath]);
      throw insertError;
  }
  
  return { fileName: safeName, publicUrl: publicUrlData.publicUrl, id: insertData[0].id };
};

export const listProcessoDocs = async (processoId, tenantId) => {
    const { data, error } = await withTenantFilter(
      "processo_Doc",
      tenantId
    )
      .select("*")
      .eq("processo_id", processoId)
      .order("data_upload", { ascending: false });
  
    if (error) throw error;
    return data;
};

export const deleteProcessoDoc = async (id, tenantId) => {
  const { data: doc, error: fetchError } = await withTenantFilter(
    "processo_Doc",
    tenantId
  )
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!doc) throw new Error("Documento não encontrado.");

  if (doc.url_publica) {
    try {
      const bucketUrlPart = `/${Bucket_Name}/`;
      const urlParts = doc.url_publica.split(bucketUrlPart);
      if (urlParts.length > 1) {
        const storagePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from(Bucket_Name).remove([storagePath]);
      }
    } catch (err) {
      logError("upload.processo_doc.storage_error", "Erro ao limpar storage", { error: err });
    }
  }

  const { error: deleteError } = await withTenantFilter(
    "processo_Doc",
    tenantId
  )
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;
  
  return true;
};
