// ============================================
// V4 — CATEGORIAS DE PRODUTOS E INTELIGÊNCIA COMERCIAL
// Implementação incremental e compatível com o modelo atual de leads.
// ============================================
const COMERCIAL_STORAGE_KEY = 'feitosaCRM_comercialInteligencia_v4';
let comercialCategoriaEditandoId = null;
let comercialEmpresaSelecionadaId = null;

const POTENCIA_LABELS = [
    { min: 80, label: 'Muito alto', color: 'var(--success)' },
    { min: 60, label: 'Alto', color: 'var(--info)' },
    { min: 35, label: 'Médio', color: 'var(--warning)' },
    { min: 1, label: 'Baixo', color: 'var(--text-secondary)' },
    { min: 0, label: 'Sem potencial identificado', color: 'var(--text-muted)' }
];

function comercialId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function comercialNormalizar(valor) {
    return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function comercialLista(valor) {
    if (Array.isArray(valor)) return valor.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
    return String(valor || '').split(/[,;\n]/).map(v => v.trim()).filter(Boolean);
}

function comercialDadosPadrao() {
    return {
        categorias: [
            {
                id: 'cat-pneumatica', nome: 'Automação Pneumática', descricao: 'Soluções para movimento, controle e tratamento de ar comprimido.',
                clientesAlvo: ['Fabricantes de máquinas', 'Integradores de automação', 'Indústria alimentícia', 'Indústria automotiva'],
                segmentos: ['máquinas especiais', 'embalagem', 'envase', 'automação industrial'], cnaes: [], palavrasChave: ['pneumática', 'máquina', 'embalagem', 'envase', 'automação', 'montagem'],
                subcategorias: [
                    { id: 'sub-atuadores', nome: 'Atuadores Pneumáticos', subsubcategorias: [{ id: 'ss-cilindros', nome: 'Cilindros ISO', produtos: ['Cilindro ISO 15552', 'Cilindro ISO com sensor magnético', 'Cilindro de dupla ação'] }] },
                    { id: 'sub-valvulas', nome: 'Válvulas Pneumáticas', subsubcategorias: [{ id: 'ss-controle', nome: 'Válvulas de controle', produtos: ['Válvula solenóide', 'Válvula de processo'] }] },
                    { id: 'sub-tratamento', nome: 'Tratamento de Ar', subsubcategorias: [{ id: 'ss-frl', nome: 'Unidades FRL', produtos: ['Filtro regulador', 'Lubrificador', 'Regulador de pressão'] }] }
                ]
            },
            {
                id: 'cat-vacuo', nome: 'Automação por Vácuo', descricao: 'Componentes para manipulação e transporte por vácuo.',
                clientesAlvo: ['Fabricantes de máquinas', 'Fabricantes de máquinas de embalagem', 'Integradores de automação'], segmentos: ['embalagem', 'envase', 'manipulação'], cnaes: [], palavrasChave: ['vácuo', 'ventosa', 'embalagem', 'manipulação'],
                subcategorias: [{ id: 'sub-ventosas', nome: 'Ventosas', subsubcategorias: [{ id: 'ss-ventosas', nome: 'Ventosas industriais', produtos: ['Ventosa industrial', 'Gerador de vácuo', 'Ejetor'] }] }]
            },
            {
                id: 'cat-sensoriamento', nome: 'Sensoriamento Industrial', descricao: 'Sensores e soluções para monitoramento de processos.',
                clientesAlvo: ['Fabricantes de máquinas', 'Indústria automotiva', 'Metalúrgicas'], segmentos: ['automação industrial', 'controle de processo'], cnaes: [], palavrasChave: ['sensor', 'detecção', 'controle', 'processo'],
                subcategorias: [{ id: 'sub-sensores', nome: 'Sensores', subsubcategorias: [{ id: 'ss-presenca', nome: 'Detecção e presença', produtos: ['Sensor indutivo', 'Sensor fotoelétrico', 'Sensor magnético'] }] }]
            }
        ], regras: []
    };
}

function comercialCarregarDados() {
    try {
        const salvo = JSON.parse(localStorage.getItem(COMERCIAL_STORAGE_KEY) || 'null');
        if (salvo && Array.isArray(salvo.categorias)) return salvo;
    } catch (e) { console.warn('Dados comerciais inválidos, usando padrão.', e); }
    const padrao = comercialDadosPadrao();
    localStorage.setItem(COMERCIAL_STORAGE_KEY, JSON.stringify(padrao));
    return padrao;
}

function comercialSalvarDados(dados) {
    localStorage.setItem(COMERCIAL_STORAGE_KEY, JSON.stringify(dados));
}

function comercialEscapar(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function comercialClassificacoesCarregar() {
    try { return JSON.parse(localStorage.getItem('feitosaCRM_classificacoes_v4') || '{}'); } catch (e) { return {}; }
}
function comercialObterLead(id) {
    const lead = (leads || []).find(l => String(l.id) === String(id));
    if (!lead) return null;
    const classificacoes = comercialClassificacoesCarregar();
    return { ...lead, ...(classificacoes[String(id)] || {}) };
}
function comercialEmpresaTexto(lead) {
    return [lead?.empresa, lead?.segmento, lead?.classificacaoEstrategica, lead?.classificacao, lead?.tipoIndustria, lead?.mercadoAtendido, lead?.processoProdutivo, lead?.produtosFabricados, lead?.cnae, lead?.cnaesSecundarios, lead?.observacoesComerciais].flat().join(' ');
}

function comercialPotencial(score) { return POTENCIA_LABELS.find(item => score >= item.min) || POTENCIA_LABELS[POTENCIA_LABELS.length - 1]; }

function comercialFlattenProdutos(categoria) {
    const produtos = [];
    (categoria.subcategorias || []).forEach(sub => (sub.subsubcategorias || []).forEach(ss => (ss.produtos || []).forEach(produto => produtos.push({ produto, subcategoria: sub.nome, subsubcategoria: ss.nome }))));
    return produtos;
}

function comercialCalcularRecomendacao(lead, categoria) {
    const texto = comercialNormalizar(comercialEmpresaTexto(lead));
    const campos = [lead?.segmento, lead?.classificacaoEstrategica, lead?.tipoIndustria, lead?.mercadoAtendido, lead?.processoProdutivo, lead?.produtosFabricados, lead?.cnae, lead?.cnaesSecundarios].map(comercialNormalizar).join(' ');
    const motivos = [];
    let pontos = 0;
    const alvo = (categoria.clientesAlvo || []).filter(Boolean);
    const segmentos = (categoria.segmentos || []).filter(Boolean);
    const palavras = (categoria.palavrasChave || []).filter(Boolean);
    const cnaes = (categoria.cnaes || []).filter(Boolean);
    const hits = (lista, peso, nome) => lista.forEach(item => { const termo = comercialNormalizar(item); if (termo && (texto.includes(termo) || campos.includes(termo))) { pontos += peso; motivos.push(`${nome}: “${item}” encontrado no perfil da empresa`); } });
    hits(alvo, 28, 'Cliente-alvo compatível');
    hits(segmentos, 22, 'Segmento compatível');
    hits(cnaes, 30, 'CNAE relacionado');
    hits(palavras, 10, 'Sinal comercial');
    if (lead?.classificacaoEstrategica && alvo.some(a => comercialNormalizar(lead.classificacaoEstrategica).includes(comercialNormalizar(a)) || comercialNormalizar(a).includes(comercialNormalizar(lead.classificacaoEstrategica)))) { pontos += 15; motivos.push('Classificação estratégica alinhada ao cliente-alvo da categoria'); }
    pontos = Math.min(100, pontos);
    if (!motivos.length) motivos.push('Ainda não existem sinais cadastrados que conectem o perfil da empresa a esta categoria.');
    return { ...categoria, score: pontos, potencial: comercialPotencial(pontos), motivos, produtos: comercialFlattenProdutos(categoria) };
}

function comercialRecomendacoes(lead) {
    return comercialCarregarDados().categorias.map(cat => comercialCalcularRecomendacao(lead, cat)).sort((a, b) => b.score - a.score);
}

function renderizarComercial() {
    const dados = comercialCarregarDados();
    const select = document.getElementById('comercialEmpresaSelect');
    if (!select) return;
    const leadsVisiveis = Array.isArray(leads) ? leads : [];
    const atual = comercialEmpresaSelecionadaId || select.value || leadsVisiveis[0]?.id || '';
    select.innerHTML = '<option value="">Selecione uma empresa...</option>' + leadsVisiveis.map(l => `<option value="${comercialEscapar(l.id)}">${comercialEscapar(l.empresa || 'Empresa sem nome')}</option>`).join('');
    if (leadsVisiveis.some(l => String(l.id) === String(atual))) { select.value = atual; comercialEmpresaSelecionadaId = atual; }
    renderizarPerfilComercial();
    renderizarCategoriasComercial(dados);
}

function comercialSelecionarEmpresa(id) { comercialEmpresaSelecionadaId = id; renderizarPerfilComercial(); }

function renderizarPerfilComercial() {
    const lead = comercialObterLead(comercialEmpresaSelecionadaId);
    const perfil = document.getElementById('comercialPerfilEmpresa');
    const recomendacoesEl = document.getElementById('comercialRecomendacoes');
    if (!perfil || !recomendacoesEl) return;
    if (!lead) { perfil.innerHTML = '<div class="empty-state"><p>Selecione uma empresa para iniciar a análise de potencial.</p></div>'; recomendacoesEl.innerHTML = ''; return; }
    perfil.innerHTML = `<div class="commercial-profile-header"><div><span class="text-xs text-muted">EMPRESA ANALISADA</span><h3>${comercialEscapar(lead.empresa || 'Sem nome')}</h3></div><span class="commercial-code">${comercialEscapar(lead.cidade || '')}${lead.estado ? ` / ${comercialEscapar(lead.estado)}` : ''}</span></div><div class="commercial-profile-grid"><label>Segmento<input id="comercialSegmento" value="${comercialEscapar(lead.segmento || '')}" placeholder="Ex.: Embalagem"></label><label>Classificação estratégica<input id="comercialClassificacao" value="${comercialEscapar(lead.classificacaoEstrategica || '')}" placeholder="Ex.: Fabricante de Máquinas"></label><label>CNAE principal<input id="comercialCnae" value="${comercialEscapar(lead.cnae || '')}" placeholder="Código ou descrição"></label><label>Tipo de indústria<input id="comercialIndustria" value="${comercialEscapar(lead.tipoIndustria || '')}" placeholder="Ex.: Alimentícia"></label><label>Mercado atendido<input id="comercialMercado" value="${comercialEscapar(lead.mercadoAtendido || '')}" placeholder="Ex.: B2B industrial"></label><label>Processo produtivo<input id="comercialProcesso" value="${comercialEscapar(lead.processoProdutivo || '')}" placeholder="Ex.: Montagem e envase"></label><label class="commercial-field-wide">Produtos fabricados<input id="comercialProdutos" value="${comercialEscapar(lead.produtosFabricados || '')}" placeholder="Separe por vírgulas"></label><label class="commercial-field-wide">Observações comerciais<textarea id="comercialObservacoes" rows="2" placeholder="Contexto útil para o vendedor">${comercialEscapar(lead.observacoesComerciais || '')}</textarea></label></div><div class="commercial-actions"><button class="btn btn-primary btn-sm" onclick="salvarPerfilComercial()">Salvar classificação</button><span class="text-xs text-muted">A pontuação é recalculada com base nos dados salvos.</span></div>`;
    const recs = comercialRecomendacoes(lead);
    recomendacoesEl.innerHTML = `<div class="commercial-summary"><div><span class="text-xs text-muted">CATEGORIAS RECOMENDADAS</span><strong>${recs.filter(r => r.score > 0).length}</strong></div><div><span class="text-xs text-muted">MAIOR COMPATIBILIDADE</span><strong>${recs[0]?.score || 0}%</strong></div><div><span class="text-xs text-muted">NÍVEL</span><strong>${recs[0]?.potencial.label || 'Sem análise'}</strong></div></div>` + recs.map(comercialRenderRecomendacao).join('');
}

function comercialRenderRecomendacao(rec) {
    const produtos = rec.produtos.slice(0, 6).map(p => `<span class="commercial-tag">${comercialEscapar(p.produto)}</span>`).join('') || '<span class="text-muted text-sm">Cadastre produtos nesta subsubcategoria.</span>';
    const motivos = rec.motivos.map(m => `<li>${comercialEscapar(m)}</li>`).join('');
    return `<article class="commercial-recommendation"><div class="commercial-rec-head"><div><h3>${comercialEscapar(rec.nome)}</h3><p>${comercialEscapar(rec.descricao || 'Categoria de produtos')}</p></div><div class="commercial-score"><strong>${rec.score}%</strong><span style="color:${rec.potencial.color}">${comercialEscapar(rec.potencial.label)}</span></div></div><div class="commercial-bar"><span style="width:${rec.score}%"></span></div><div class="commercial-rec-body"><div><h4>Subcategorias recomendadas</h4><p>${(rec.subcategorias || []).map(s => comercialEscapar(s.nome)).join(' · ') || 'Nenhuma cadastrada'}</p><h4>Produtos com maior potencial</h4><div class="commercial-tags">${produtos}</div></div><div><h4>Por que foi recomendado?</h4><ul class="commercial-reasons">${motivos}</ul></div></div><div class="commercial-rec-actions"><button class="btn btn-outline btn-xs" onclick="marcarRecomendacaoComercial('${comercialEscapar(rec.id)}','apresentado')">Marcar como apresentado</button><button class="btn btn-primary btn-xs" onclick="criarOportunidadeRecomendacao()">Criar oportunidade</button><button class="btn btn-outline btn-xs" onclick="marcarRecomendacaoComercial('${comercialEscapar(rec.id)}','sem_interesse')">Sem interesse</button></div></article>`;
}

function salvarPerfilComercial() {
    const lead = comercialObterLead(comercialEmpresaSelecionadaId);
    if (!lead) return;
    const classificacao = { segmento: document.getElementById('comercialSegmento')?.value.trim(), classificacaoEstrategica: document.getElementById('comercialClassificacao')?.value.trim(), cnae: document.getElementById('comercialCnae')?.value.trim(), tipoIndustria: document.getElementById('comercialIndustria')?.value.trim(), mercadoAtendido: document.getElementById('comercialMercado')?.value.trim(), processoProdutivo: document.getElementById('comercialProcesso')?.value.trim(), produtosFabricados: document.getElementById('comercialProdutos')?.value.trim(), observacoesComerciais: document.getElementById('comercialObservacoes')?.value.trim() };
    Object.assign(lead, classificacao);
    const classificacoes = comercialClassificacoesCarregar();
    classificacoes[String(lead.id)] = classificacao;
    localStorage.setItem('feitosaCRM_classificacoes_v4', JSON.stringify(classificacoes));
    const leadOriginal = (leads || []).find(l => String(l.id) === String(comercialEmpresaSelecionadaId));
    if (leadOriginal) Object.assign(leadOriginal, classificacao);
    if (typeof salvarDados === 'function') salvarDados();
    renderizarPerfilComercial();
    if (typeof showToast === 'function') showToast('Classificação empresarial salva. Recomendações recalculadas.', 'success');
}

function renderizarCategoriasComercial(dados = comercialCarregarDados()) {
    const el = document.getElementById('comercialCategoriasLista');
    if (!el) return;
    el.innerHTML = dados.categorias.map(cat => `<article class="category-admin-card"><div class="category-admin-head"><div><h3>${comercialEscapar(cat.nome)}</h3><p>${comercialEscapar(cat.descricao || '')}</p></div><div class="flex gap-8"><button class="btn btn-outline btn-xs" onclick="editarCategoriaComercial('${cat.id}')">Editar</button><button class="btn btn-danger btn-xs" onclick="excluirCategoriaComercial('${cat.id}')">Excluir</button></div></div><div class="category-meta"><span>${(cat.subcategorias || []).length} subcategorias</span><span>${comercialFlattenProdutos(cat).length} produtos</span><span>${(cat.clientesAlvo || []).length} clientes-alvo</span></div><div class="category-tree">${(cat.subcategorias || []).map(sub => `<details><summary>${comercialEscapar(sub.nome)}</summary>${(sub.subsubcategorias || []).map(ss => `<div class="category-tree-leaf"><strong>${comercialEscapar(ss.nome)}</strong><span>${(ss.produtos || []).map(comercialEscapar).join(' · ') || 'Sem produtos cadastrados'}</span></div>`).join('')}</details>`).join('')}</div></article>`).join('') || '<div class="empty-state"><p>Nenhuma categoria cadastrada.</p></div>';
}

function limparFormCategoriaComercial() { comercialCategoriaEditandoId = null; ['categoriaNome','categoriaDescricao','categoriaClientes','categoriaSegmentos','categoriaCnaes','categoriaPalavras','categoriaEstrutura'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); const titulo = document.getElementById('categoriaFormTitulo'); if (titulo) titulo.textContent = 'Nova categoria'; }

function editarCategoriaComercial(id) { const cat = comercialCarregarDados().categorias.find(c => c.id === id); if (!cat) return; comercialCategoriaEditandoId = id; document.getElementById('categoriaNome').value = cat.nome || ''; document.getElementById('categoriaDescricao').value = cat.descricao || ''; document.getElementById('categoriaClientes').value = (cat.clientesAlvo || []).join(', '); document.getElementById('categoriaSegmentos').value = (cat.segmentos || []).join(', '); document.getElementById('categoriaCnaes').value = (cat.cnaes || []).join(', '); document.getElementById('categoriaPalavras').value = (cat.palavrasChave || []).join(', '); document.getElementById('categoriaEstrutura').value = (cat.subcategorias || []).map(s => `${s.nome} > ${(s.subsubcategorias || []).map(ss => `${ss.nome}: ${(ss.produtos || []).join('|')}`).join(' ; ')}`).join('\n'); document.getElementById('categoriaFormTitulo').textContent = 'Editar categoria'; document.getElementById('categoriaNome')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

function salvarCategoriaComercial(event) { event.preventDefault(); const dados = comercialCarregarDados(); const existente = dados.categorias.find(c => c.id === comercialCategoriaEditandoId); const estrutura = String(document.getElementById('categoriaEstrutura')?.value || '').split(/\n+/).map(linha => linha.trim()).filter(Boolean).map(linha => { const [subNome, resto = ''] = linha.split('>').map(v => v.trim()); const subsubcategorias = resto.split(';').map(item => item.trim()).filter(Boolean).map(item => { const [ssNome, produtos = ''] = item.split(':').map(v => v.trim()); return { id: comercialId('ss'), nome: ssNome, produtos: produtos.split('|').map(v => v.trim()).filter(Boolean) }; }); return { id: comercialId('sub'), nome: subNome, subsubcategorias }; }); const categoria = { id: comercialCategoriaEditandoId || comercialId('cat'), nome: document.getElementById('categoriaNome').value.trim(), descricao: document.getElementById('categoriaDescricao').value.trim(), clientesAlvo: comercialLista(document.getElementById('categoriaClientes').value), segmentos: comercialLista(document.getElementById('categoriaSegmentos').value), cnaes: comercialLista(document.getElementById('categoriaCnaes').value), palavrasChave: comercialLista(document.getElementById('categoriaPalavras').value), subcategorias: estrutura }; if (!categoria.nome) return; if (existente) Object.assign(existente, categoria); else dados.categorias.push(categoria); comercialSalvarDados(dados); limparFormCategoriaComercial(); renderizarComercial(); if (typeof showToast === 'function') showToast('Categoria salva com sucesso.', 'success'); }

function excluirCategoriaComercial(id) { if (!confirm('Excluir esta categoria e sua estrutura de produtos?')) return; const dados = comercialCarregarDados(); dados.categorias = dados.categorias.filter(c => c.id !== id); comercialSalvarDados(dados); renderizarComercial(); if (typeof showToast === 'function') showToast('Categoria excluída.', 'success'); }

function marcarRecomendacaoComercial(categoriaId, status) { const key = 'feitosaCRM_recomendacoes_v4'; const dados = JSON.parse(localStorage.getItem(key) || '{}'); const leadId = comercialEmpresaSelecionadaId; dados[`${leadId}:${categoriaId}`] = { status, updatedAt: new Date().toISOString() }; localStorage.setItem(key, JSON.stringify(dados)); if (typeof showToast === 'function') showToast(status === 'apresentado' ? 'Recomendação marcada como apresentada.' : 'Recomendação descartada para esta empresa.', 'success'); }
function criarOportunidadeRecomendacao() { const lead = comercialObterLead(comercialEmpresaSelecionadaId); if (!lead) return; if (typeof gerarNovoNegocio === 'function') gerarNovoNegocio(lead.id); else if (typeof showToast === 'function') showToast('Empresa selecionada. Crie a oportunidade pelo Pipeline.', 'info'); }

window.renderizarComercial = renderizarComercial;
window.comercialSelecionarEmpresa = comercialSelecionarEmpresa;
window.salvarPerfilComercial = salvarPerfilComercial;
window.salvarCategoriaComercial = salvarCategoriaComercial;
window.limparFormCategoriaComercial = limparFormCategoriaComercial;
window.editarCategoriaComercial = editarCategoriaComercial;
window.excluirCategoriaComercial = excluirCategoriaComercial;
window.marcarRecomendacaoComercial = marcarRecomendacaoComercial;
window.criarOportunidadeRecomendacao = criarOportunidadeRecomendacao;
