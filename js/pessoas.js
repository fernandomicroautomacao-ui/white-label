// ============================================
// GESTÃO E RELATÓRIO DE PESSOAS & CONTATOS MULTI-EMPRESA
// Permite mapear e gerenciar todas as pessoas/contatos
// vinculadas a cada empresa por Chave Mestra (codigoUnico).
// ============================================

function getPessoasVisiveis() {
    if (!pessoas) return [];
    if (!usuarioAtual || usuarioAtual.papel === 'admin') {
        return pessoas;
    }
    // Para vendedores, exibe pessoas vinculadas às empresas/leads aos quais tem acesso ou que ele próprio cadastrou
    const meusLeadsCodigos = new Set(getLeadsVisiveis().map(l => l.codigoUnico));
    return pessoas.filter(p => p.usuarioId === usuarioAtual.id || meusLeadsCodigos.has(p.codigoUnico));
}

function popularFiltrosDinamicosPessoas(todasPessoas) {
    const selEmpresa = document.getElementById('pessoasFiltroEmpresa');
    const selSetor = document.getElementById('pessoasFiltroSetor');

    if (selEmpresa) {
        const valAtual = selEmpresa.value;
        const contagemPorEmpresa = {};
        todasPessoas.forEach(p => {
            const emp = p.empresa || 'Sem Empresa';
            contagemPorEmpresa[emp] = (contagemPorEmpresa[emp] || 0) + 1;
        });

        const empresasOrdenadas = Object.keys(contagemPorEmpresa).sort((a, b) => a.localeCompare(b));
        let html = '<option value="">Todas as empresas (' + todasPessoas.length + ')</option>';
        empresasOrdenadas.forEach(emp => {
            html += `<option value="${emp}">${emp} (${contagemPorEmpresa[emp]})</option>`;
        });
        selEmpresa.innerHTML = html;
        selEmpresa.value = valAtual;
    }

    if (selSetor) {
        const valAtual = selSetor.value;
        const contagemPorSetor = {};
        todasPessoas.forEach(p => {
            const set = p.setor || 'Outros';
            contagemPorSetor[set] = (contagemPorSetor[set] || 0) + 1;
        });

        const setoresOrdenados = Object.keys(contagemPorSetor).sort((a, b) => a.localeCompare(b));
        let html = '<option value="">Todos os setores</option>';
        setoresOrdenados.forEach(set => {
            html += `<option value="${set}">${set} (${contagemPorSetor[set]})</option>`;
        });
        selSetor.innerHTML = html;
        selSetor.value = valAtual;
    }
}

function getCorAvatar(nome) {
    const cores = ['#2f7d5b', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#059669'];
    let hash = 0;
    for (let i = 0; i < (nome || '').length; i++) {
        hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    }
    return cores[Math.abs(hash) % cores.length];
}

function getIniciaisNome(nome) {
    if (!nome) return 'PS';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function getClasseBadgeSetor(setor) {
    const s = (setor || '').toLowerCase();
    if (s.includes('compra') || s.includes('suprimento')) return 'compras';
    if (s.includes('manuten') || s.includes('preditiva')) return 'manutencao';
    if (s.includes('engenh') || s.includes('projeto')) return 'engenharia';
    if (s.includes('diretor') || s.includes('c-level') || s.includes('ceo')) return 'diretoria';
    if (s.includes('opera') || s.includes('fábrica') || s.includes('produç')) return 'operacoes';
    return 'outros';
}

function getRotuloDecisor(decisor) {
    switch (decisor) {
        case 'sim':
            return '<span class="decisor-badge sim" title="Tem autoridade final para compra ou contratação">⭐ Tomador de Decisão</span>';
        case 'influenciador':
            return '<span class="decisor-badge influenciador" title="Influencia a escolha técnica ou financeira">💡 Influenciador Chave</span>';
        case 'tecnico':
            return '<span class="decisor-badge tecnico" title="Avalia requisitos técnicos e conformidade">⚙️ Avaliador Técnico</span>';
        case 'operacional':
            return '<span class="decisor-badge operacional" title="Usuário operacional dos produtos/serviços">🛠️ Operacional</span>';
        default:
            return '<span class="decisor-badge nao">Contato Comercial</span>';
    }
}

function renderizarPessoas() {
    const todasPessoas = getPessoasVisiveis();
    popularFiltrosDinamicosPessoas(todasPessoas);

    // Atualiza KPIs do Resumo
    const kpiTotal = document.getElementById('kpiPessoasTotal');
    const kpiEmpresas = document.getElementById('kpiPessoasEmpresas');
    const kpiDecisores = document.getElementById('kpiPessoasDecisores');
    const kpiSetores = document.getElementById('kpiPessoasSetores');

    const empresasUnicas = new Set(todasPessoas.map(p => p.codigoUnico || p.empresa));
    const decisoresCount = todasPessoas.filter(p => p.decisor === 'sim' || p.decisor === 'influenciador').length;
    const setoresUnicos = new Set(todasPessoas.map(p => (p.setor || '').trim().toLowerCase()).filter(Boolean));

    if (kpiTotal) kpiTotal.textContent = todasPessoas.length;
    if (kpiEmpresas) kpiEmpresas.textContent = empresasUnicas.size;
    if (kpiDecisores) kpiDecisores.textContent = decisoresCount;
    if (kpiSetores) kpiSetores.textContent = setoresUnicos.size;

    // Obter valores dos filtros
    const busca = (document.getElementById('pessoasSearchInput')?.value || '').toLowerCase().trim();
    const filtroEmpresa = document.getElementById('pessoasFiltroEmpresa')?.value || '';
    const filtroSetor = document.getElementById('pessoasFiltroSetor')?.value || '';
    const filtroDecisor = document.getElementById('pessoasFiltroDecisor')?.value || '';
    const filtroPotencial = document.getElementById('pessoasFiltroPotencial')?.value || '';
    const filtroClassificacao = document.getElementById('pessoasFiltroClassificacao')?.value || '';

    // Mapa de informações de leads para classificação e potencial
    const leadMap = {};
    leads.forEach(l => {
        if (!leadMap[l.codigoUnico]) {
            leadMap[l.codigoUnico] = l;
        }
    });

    // Filtragem
    let filtradas = todasPessoas.filter(p => {
        if (filtroEmpresa && p.empresa !== filtroEmpresa) return false;
        if (filtroSetor && p.setor !== filtroSetor) return false;
        if (filtroDecisor && p.decisor !== filtroDecisor) return false;

        const leadRef = leadMap[p.codigoUnico];
        if (filtroPotencial && (!leadRef || (leadRef.potencial || 'B') !== filtroPotencial)) return false;
        if (filtroClassificacao && (!leadRef || (leadRef.classificacao || 'outros') !== filtroClassificacao)) return false;

        if (busca) {
            const haystack = [
                p.nome,
                p.titulo,
                p.setor,
                p.empresa,
                p.codigoUnico,
                p.codigoUnicoPessoa,
                p.email,
                p.whatsapp,
                p.telefone,
                p.observacoes
            ].filter(Boolean).join(' ').toLowerCase();

            if (!haystack.includes(busca)) return false;
        }
        return true;
    });

    // Ordenar por Empresa e depois Nome
    filtradas.sort((a, b) => {
        const empComp = (a.empresa || '').localeCompare(b.empresa || '');
        if (empComp !== 0) return empComp;
        return (a.nome || '').localeCompare(b.nome || '');
    });

    const tbody = document.getElementById('pessoasTabelaBody');
    const emptyState = document.getElementById('pessoasEmptyState');

    if (!tbody) return;

    if (filtradas.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = `
                <div class="empty-state">
                    <span class="emoji-big"><span data-icone="pessoas"></span></span>
                    <p style="font-weight:600;font-size:15px;margin:8px 0 4px 0;">Nenhuma pessoa encontrada com os filtros selecionados</p>
                    <p class="text-xs text-muted mb-16">Altere os filtros de busca ou cadastre uma nova pessoa vinculada a uma empresa.</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalPessoa()">+ Cadastrar Nova Pessoa</button>
                </div>
            `;
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = filtradas.map(p => {
        const leadRef = leadMap[p.codigoUnico] || {};
        const potencial = leadRef.potencial || 'B';
        const classificacao = leadRef.classificacao || 'Padrão';
        const corAvatar = getCorAvatar(p.nome);
        const iniciais = getIniciaisNome(p.nome);
        const waClean = (p.whatsapp || '').replace(/\D/g, '');
        const classeSetor = getClasseBadgeSetor(p.setor);
        const decisorHtml = getRotuloDecisor(p.decisor);

        return `
            <tr style="border-bottom:1px solid var(--border-color);transition:background 0.15s;" onmouseover="this.style.background='rgba(45,72,99,0.03)'" onmouseout="this.style.background='transparent'">
                <!-- Pessoa & Código -->
                <td style="padding:12px 14px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="pessoa-avatar" style="background:${corAvatar};">${iniciais}</div>
                        <div>
                            <div style="font-weight:700;color:var(--text-primary);font-size:14px;">${p.nome}</div>
                            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                                <span class="codigo-mestra-chip" title="Chave única individual">${p.codigoUnicoPessoa || p.id}</span>
                                <button type="button" class="btn btn-xs btn-outline" style="padding:1px 4px;font-size:10px;" onclick="copiarTextoClipboard('${p.codigoUnicoPessoa || p.id}')" title="Copiar código">Copiar</button>
                            </div>
                        </div>
                    </div>
                </td>

                <!-- Empresa & Chave Mestra -->
                <td style="padding:12px 14px;">
                    <div style="font-weight:600;color:var(--text-primary);">
                        <a href="javascript:void(0)" onclick="abrirPerfilEmpresaPorCodigo('${p.codigoUnico}')" style="color:var(--primary-color);text-decoration:none;font-weight:700;" title="Ver ficha da empresa">
                            ${p.empresa}
                        </a>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap;">
                        <span class="codigo-mestra-chip" title="Chave mestra da empresa">🔑 ${p.codigoUnico}</span>
                        <span class="role-badge ${potencial === 'C' ? '' : 'vendedor'}" style="${potencial === 'C' ? 'background:#94a3b8;' : ''}" title="Potencial de compra">${potencial}</span>
                        <span class="text-xs text-muted" style="text-transform:capitalize;">${classificacao}</span>
                    </div>
                </td>

                <!-- Título / Cargo -->
                <td style="padding:12px 14px;">
                    <div style="font-weight:600;color:var(--text-primary);">${p.titulo || '—'}</div>
                </td>

                <!-- Setor de Atuação -->
                <td style="padding:12px 14px;">
                    <span class="setor-badge ${classeSetor}">${p.setor || 'Geral'}</span>
                </td>

                <!-- Canais de Contato -->
                <td style="padding:12px 14px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        ${waClean ? `
                            <a href="https://wa.me/55${waClean}?text=${encodeURIComponent('Olá ' + p.nome + ', tudo bem? Aqui é da equipe comercial da ' + (typeof configEmpresa !== 'undefined' ? configEmpresa.nome : 'nossa empresa') + '.')}" target="_blank" class="btn-icon-canal wa" title="Abrir conversa no WhatsApp (${p.whatsapp})">
                                <span data-icone="whatsapp"></span>
                            </a>
                        ` : ''}
                        ${p.email ? `
                            <button type="button" class="btn-icon-canal email" onclick="abrirEnvioEmailPessoa('${p.email}', '${p.nome}', '${p.empresa}')" title="Enviar e-mail para ${p.email}">
                                <span data-icone="marketing"></span>
                            </button>
                        ` : ''}
                        ${p.telefone ? `
                            <a href="tel:${p.telefone.replace(/\D/g, '')}" class="btn-icon-canal tel" title="Ligar para ${p.telefone}">
                                <span data-icone="telefone"></span>
                            </a>
                        ` : ''}
                    </div>
                    <div class="text-xs text-muted" style="margin-top:4px;">
                        ${p.email ? `<div>${p.email}</div>` : ''}
                        ${p.telefone ? `<div>${p.telefone}</div>` : ''}
                    </div>
                </td>

                <!-- Papel Decisório -->
                <td style="padding:12px 14px;">
                    ${decisorHtml}
                </td>

                <!-- Observações -->
                <td style="padding:12px 14px;max-width:240px;">
                    <div style="font-size:12px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;" title="${p.observacoes || 'Sem observações'}">
                        ${p.observacoes || '<span class="text-muted">—</span>'}
                    </div>
                </td>

                <!-- Ações -->
                <td style="padding:12px 14px;text-align:center;">
                    <div style="display:inline-flex;gap:4px;">
                        <button type="button" class="btn btn-outline btn-xs" onclick="abrirModalPessoa('${p.id}')" title="Editar dados da pessoa">
                            <span data-icone="editar"></span>
                        </button>
                        <button type="button" class="btn btn-danger btn-xs" onclick="excluirPessoa('${p.id}')" title="Excluir pessoa">
                            <span data-icone="excluir"></span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (typeof Lucide !== 'undefined' || typeof renderizarIcones === 'function') {
        renderizarIcones();
    }
}

// --------------------------------------------------------------------------
// MODAL: CRIAR / EDITAR PESSOA
// --------------------------------------------------------------------------
function gerarCodigoUnicoPessoa() {
    const existentes = new Set((pessoas || []).map(p => p.codigoUnicoPessoa));
    let num = (pessoas || []).length + 1;
    let candidato = `PES-${String(num).padStart(4, '0')}`;
    while (existentes.has(candidato)) {
        num++;
        candidato = `PES-${String(num).padStart(4, '0')}`;
    }
    return candidato;
}

function abrirModalPessoa(pessoaId, codigoUnicoPadrao, empresaPadrao) {
    const form = document.getElementById('pessoaForm');
    if (!form) return;
    form.reset();

    const tituloEl = document.getElementById('pessoaModalTitle');
    const idInput = document.getElementById('pessoaId');
    const selectEmpresa = document.getElementById('pessoaSelectEmpresa');
    const inputCustomEmpresa = document.getElementById('pessoaEmpresaCustom');
    const codUnicoEmpresaInput = document.getElementById('pessoaCodigoUnico');
    const codUnicoPessoaInput = document.getElementById('pessoaCodigoUnicoPessoa');
    const inputNome = document.getElementById('pessoaNome');
    const inputTitulo = document.getElementById('pessoaTitulo');
    const inputSetor = document.getElementById('pessoaSetor');
    const inputWhatsapp = document.getElementById('pessoaWhatsapp');
    const inputTelefone = document.getElementById('pessoaTelefone');
    const inputEmail = document.getElementById('pessoaEmail');
    const selectDecisor = document.getElementById('pessoaDecisor');
    const selectStatus = document.getElementById('pessoaStatus');
    const inputObs = document.getElementById('pessoaObservacoes');

    // Popula select de empresas com leads do CRM
    const empresasMap = new Map();
    leads.forEach(l => {
        if (l.empresa && !empresasMap.has(l.empresa)) {
            empresasMap.set(l.empresa, l.codigoUnico || l.cnpj || l.empresa);
        }
    });

    let optHtml = '<option value="">-- Selecione uma empresa do CRM --</option>';
    empresasMap.forEach((cod, emp) => {
        optHtml += `<option value="${emp}" data-codigo="${cod}">${emp} (${cod})</option>`;
    });
    optHtml += '<option value="__OUTRA__">+ Cadastrar para Outra Empresa...</option>';
    selectEmpresa.innerHTML = optHtml;

    if (pessoaId) {
        const p = (pessoas || []).find(item => item.id === pessoaId);
        if (!p) return;
        if (tituloEl) tituloEl.textContent = 'Editar Pessoa / Contato';
        if (idInput) idInput.value = p.id;

        if (empresasMap.has(p.empresa)) {
            selectEmpresa.value = p.empresa;
            inputCustomEmpresa.style.display = 'none';
        } else {
            selectEmpresa.value = '__OUTRA__';
            inputCustomEmpresa.style.display = 'block';
            inputCustomEmpresa.value = p.empresa;
        }

        codUnicoEmpresaInput.value = p.codigoUnico || '';
        codUnicoPessoaInput.value = p.codigoUnicoPessoa || p.id;
        inputNome.value = p.nome || '';
        inputTitulo.value = p.titulo || '';
        inputSetor.value = p.setor || '';
        inputWhatsapp.value = p.whatsapp || '';
        inputTelefone.value = p.telefone || '';
        inputEmail.value = p.email || '';
        selectDecisor.value = p.decisor || 'nao';
        selectStatus.value = p.status || 'ativo';
        inputObs.value = p.observacoes || '';
    } else {
        if (tituloEl) tituloEl.textContent = 'Nova Pessoa / Contato';
        if (idInput) idInput.value = '';
        codUnicoPessoaInput.value = gerarCodigoUnicoPessoa();

        if (empresaPadrao && empresasMap.has(empresaPadrao)) {
            selectEmpresa.value = empresaPadrao;
            codUnicoEmpresaInput.value = codigoUnicoPadrao || empresasMap.get(empresaPadrao);
            inputCustomEmpresa.style.display = 'none';
        } else if (empresaPadrao) {
            selectEmpresa.value = '__OUTRA__';
            inputCustomEmpresa.style.display = 'block';
            inputCustomEmpresa.value = empresaPadrao;
            codUnicoEmpresaInput.value = codigoUnicoPadrao || empresaPadrao.toLowerCase().replace(/\s+/g, '-');
        } else {
            inputCustomEmpresa.style.display = 'none';
            codUnicoEmpresaInput.value = '';
        }
    }

    abrirModal('pessoaModal');
}

function onPessoaEmpresaSelecionada() {
    const select = document.getElementById('pessoaSelectEmpresa');
    const custom = document.getElementById('pessoaEmpresaCustom');
    const codInput = document.getElementById('pessoaCodigoUnico');

    if (!select || !codInput) return;

    if (select.value === '__OUTRA__') {
        custom.style.display = 'block';
        custom.focus();
        codInput.value = '';
    } else {
        custom.style.display = 'none';
        const opt = select.selectedOptions[0];
        const cod = opt ? opt.getAttribute('data-codigo') : '';
        codInput.value = cod || '';
    }
}

async function salvarPessoaModal(e) {
    if (e) e.preventDefault();

    const idInput = document.getElementById('pessoaId');
    const selectEmpresa = document.getElementById('pessoaSelectEmpresa');
    const inputCustomEmpresa = document.getElementById('pessoaEmpresaCustom');
    const codUnicoEmpresaInput = document.getElementById('pessoaCodigoUnico');
    const codUnicoPessoaInput = document.getElementById('pessoaCodigoUnicoPessoa');
    const inputNome = document.getElementById('pessoaNome');
    const inputTitulo = document.getElementById('pessoaTitulo');
    const inputSetor = document.getElementById('pessoaSetor');
    const inputWhatsapp = document.getElementById('pessoaWhatsapp');
    const inputTelefone = document.getElementById('pessoaTelefone');
    const inputEmail = document.getElementById('pessoaEmail');
    const selectDecisor = document.getElementById('pessoaDecisor');
    const selectStatus = document.getElementById('pessoaStatus');
    const inputObs = document.getElementById('pessoaObservacoes');

    let empresa = selectEmpresa.value;
    if (empresa === '__OUTRA__') {
        empresa = (inputCustomEmpresa.value || '').trim();
    }
    if (!empresa) {
        showToast('Informe a empresa vinculada.', 'error');
        return;
    }

    const nome = (inputNome.value || '').trim();
    if (!nome) {
        showToast('Informe o nome da pessoa.', 'error');
        return;
    }

    let codigoUnico = (codUnicoEmpresaInput.value || '').trim();
    if (!codigoUnico) {
        codigoUnico = empresa.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    let codigoUnicoPessoa = (codUnicoPessoaInput.value || '').trim();
    if (!codigoUnicoPessoa) {
        codigoUnicoPessoa = gerarCodigoUnicoPessoa();
    }

    const id = idInput.value || `pes-${Date.now()}`;
    const jaExisteIndex = (pessoas || []).findIndex(p => p.id === id);

    const dadosPessoa = {
        id,
        codigoUnicoPessoa,
        codigoUnico,
        empresa,
        nome,
        titulo: (inputTitulo.value || '').trim(),
        setor: (inputSetor.value || '').trim(),
        whatsapp: (inputWhatsapp.value || '').trim(),
        telefone: (inputTelefone.value || '').trim(),
        email: (inputEmail.value || '').trim(),
        decisor: selectDecisor.value || 'nao',
        status: selectStatus.value || 'ativo',
        observacoes: (inputObs.value || '').trim(),
        usuarioId: usuarioAtual ? usuarioAtual.id : null,
        dataCadastro: jaExisteIndex >= 0 ? pessoas[jaExisteIndex].dataCadastro : new Date().toISOString()
    };

    if (jaExisteIndex >= 0) {
        pessoas[jaExisteIndex] = dadosPessoa;
    } else {
        pessoas.push(dadosPessoa);
    }

    fecharModal('pessoaModal');
    salvarDados();
    renderizarPessoas();
    atualizarContadores();
    showToast(jaExisteIndex >= 0 ? 'Pessoa atualizada com sucesso!' : 'Pessoa cadastrada com sucesso!');

    // Se o modal de cliente estiver aberto para esta mesma empresa, re-renderiza contatos
    const clienteModal = document.getElementById('clienteModal');
    if (clienteModal && clienteModal.classList.contains('active')) {
        renderizarPessoasNoModalCliente(codigoUnico);
    }
}

function excluirPessoa(id) {
    const p = (pessoas || []).find(item => item.id === id);
    if (!p) return;

    if (!confirm(`Deseja realmente remover o contato "${p.nome}" da empresa "${p.empresa}"?`)) {
        return;
    }

    pessoas = pessoas.filter(item => item.id !== id);
    salvarDados();
    renderizarPessoas();
    atualizarContadores();
    showToast('Contato removido com sucesso!');

    const clienteModal = document.getElementById('clienteModal');
    if (clienteModal && clienteModal.classList.contains('active')) {
        renderizarPessoasNoModalCliente(p.codigoUnico);
    }
}

function limparFiltrosPessoas() {
    const busca = document.getElementById('pessoasSearchInput');
    const emp = document.getElementById('pessoasFiltroEmpresa');
    const set = document.getElementById('pessoasFiltroSetor');
    const dec = document.getElementById('pessoasFiltroDecisor');
    const pot = document.getElementById('pessoasFiltroPotencial');
    const cla = document.getElementById('pessoasFiltroClassificacao');

    if (busca) busca.value = '';
    if (emp) emp.value = '';
    if (set) set.value = '';
    if (dec) dec.value = '';
    if (pot) pot.value = '';
    if (cla) cla.value = '';

    renderizarPessoas();
    showToast('Filtros limpos');
}

// --------------------------------------------------------------------------
// EXPORTAÇÃO CSV E IMPRESSÃO DE RELATÓRIO
// --------------------------------------------------------------------------
function exportarPessoasCSV() {
    const lista = getPessoasVisiveis();
    if (!lista || lista.length === 0) {
        showToast('Nenhuma pessoa para exportar.', 'warning');
        return;
    }

    const cabecalhos = [
        'Código Pessoa',
        'Nome',
        'Empresa',
        'Chave Mestra Empresa',
        'Título / Cargo',
        'Setor de Atuação',
        'WhatsApp',
        'Telefone',
        'E-mail',
        'Papel Decisório',
        'Status',
        'Observações',
        'Data Cadastro'
    ];

    const linhas = lista.map(p => [
        `"${(p.codigoUnicoPessoa || p.id).replace(/"/g, '""')}"`,
        `"${(p.nome || '').replace(/"/g, '""')}"`,
        `"${(p.empresa || '').replace(/"/g, '""')}"`,
        `"${(p.codigoUnico || '').replace(/"/g, '""')}"`,
        `"${(p.titulo || '').replace(/"/g, '""')}"`,
        `"${(p.setor || '').replace(/"/g, '""')}"`,
        `"${(p.whatsapp || '').replace(/"/g, '""')}"`,
        `"${(p.telefone || '').replace(/"/g, '""')}"`,
        `"${(p.email || '').replace(/"/g, '""')}"`,
        `"${(p.decisor || '').replace(/"/g, '""')}"`,
        `"${(p.status || 'ativo').replace(/"/g, '""')}"`,
        `"${(p.observacoes || '').replace(/"/g, '""')}"`,
        `"${formatarData(p.dataCadastro || '')}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalhos.join(';'), ...linhas.map(l => l.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_pessoas_contatos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Exportação CSV concluída com sucesso!');
}

function imprimirRelatorioPessoas() {
    window.print();
}

function copiarTextoClipboard(texto) {
    if (!texto) return;
    navigator.clipboard.writeText(texto).then(() => {
        showToast(`Copiado: ${texto}`);
    }).catch(() => {
        showToast(`Texto: ${texto}`);
    });
}

function abrirPerfilEmpresaPorCodigo(codigoUnico) {
    if (!codigoUnico) return;
    const lead = leads.find(l => l.codigoUnico === codigoUnico);
    if (lead && typeof abrirModalCliente === 'function') {
        abrirModalCliente(lead.id);
    } else {
        showToast(`Chave da Empresa: ${codigoUnico}`);
    }
}

function abrirEnvioEmailPessoa(email, nome, empresa) {
    if (!email) return;
    const assunto = encodeURIComponent(`Contato Comercial - ${empresa}`);
    const corpo = encodeURIComponent(`Olá ${nome},\n\nEspero que este e-mail o encontre bem.\n\nAtenciosamente,\n${usuarioAtual ? usuarioAtual.nome : 'Equipe Comercial'}`);
    window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`);
}

// --------------------------------------------------------------------------
// INTEGRAÇÃO NO MODAL DO CLIENTE (abrirModalCliente)
// --------------------------------------------------------------------------
function renderizarPessoasNoModalCliente(codigoUnico) {
    const container = document.getElementById('clienteModalPessoasContainer');
    if (!container) return;

    const lista = (pessoas || []).filter(p => p.codigoUnico === codigoUnico);
    const empresaNome = leads.find(l => l.codigoUnico === codigoUnico)?.empresa || '';

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;margin-bottom:10px;">
            <h4 class="subsection-title" style="margin:0;">Pessoas & Contatos da Empresa (${lista.length})</h4>
            <button type="button" class="btn btn-sm btn-primary" onclick="abrirModalPessoa(null, '${codigoUnico}', '${empresaNome.replace(/'/g, "\\'")}')">
                <span data-icone="pessoas"></span> + Adicionar Contato
            </button>
        </div>
    `;

    if (lista.length === 0) {
        html += `
            <div class="empty-state compact" style="padding:16px;background:rgba(45,72,99,0.03);border:1px dashed var(--border-color);border-radius:var(--radius-sm);">
                <p class="text-xs text-muted" style="margin:0 0 8px 0;">Nenhuma pessoa/contato cadastrada especificamente para esta empresa.</p>
                <button type="button" class="btn btn-xs btn-outline" onclick="abrirModalPessoa(null, '${codigoUnico}', '${empresaNome.replace(/'/g, "\\'")}')">
                    + Mapear Primeiro Contato
                </button>
            </div>
        `;
    } else {
        html += `
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;">
                ${lista.map(p => {
                    const waClean = (p.whatsapp || '').replace(/\D/g, '');
                    const classeSetor = getClasseBadgeSetor(p.setor);
                    const corAvatar = getCorAvatar(p.nome);
                    const iniciais = getIniciaisNome(p.nome);
                    return `
                        <div style="border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:10px;background:var(--bg-card);display:flex;flex-direction:column;justify-content:space-between;">
                            <div>
                                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <div class="pessoa-avatar" style="width:28px;height:28px;font-size:10px;background:${corAvatar};">${iniciais}</div>
                                        <div>
                                            <div style="font-weight:700;font-size:13px;color:var(--text-primary);">${p.nome}</div>
                                            <div style="font-size:11px;color:var(--text-secondary);">${p.titulo || 'Sem cargo'}</div>
                                        </div>
                                    </div>
                                    <span class="setor-badge ${classeSetor}" style="font-size:9px;padding:2px 5px;">${p.setor || 'Geral'}</span>
                                </div>
                                <div style="margin-top:8px;font-size:11px;">
                                    ${getRotuloDecisor(p.decisor)}
                                </div>
                                ${p.observacoes ? `<div class="text-xs text-muted" style="margin-top:6px;font-style:italic;">"${p.observacoes}"</div>` : ''}
                            </div>
                            <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--border-color);display:flex;align-items:center;justify-content:space-between;">
                                <div style="display:flex;gap:4px;">
                                    ${waClean ? `
                                        <a href="https://wa.me/55${waClean}" target="_blank" class="btn-icon-canal wa" style="width:24px;height:24px;" title="WhatsApp">
                                            <span data-icone="whatsapp"></span>
                                        </a>
                                    ` : ''}
                                    ${p.email ? `
                                        <button type="button" class="btn-icon-canal email" style="width:24px;height:24px;" onclick="abrirEnvioEmailPessoa('${p.email}', '${p.nome}', '${p.empresa}')" title="Email">
                                            <span data-icone="marketing"></span>
                                        </button>
                                    ` : ''}
                                </div>
                                <div style="display:flex;gap:4px;">
                                    <button type="button" class="btn btn-outline btn-xs" style="padding:2px 6px;" onclick="abrirModalPessoa('${p.id}')">Editar</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    container.innerHTML = html;
    if (typeof renderizarIcones === 'function') renderizarIcones();
}

window.renderizarPessoas = renderizarPessoas;
window.abrirModalPessoa = abrirModalPessoa;
window.salvarPessoaModal = salvarPessoaModal;
window.excluirPessoa = excluirPessoa;
window.limparFiltrosPessoas = limparFiltrosPessoas;
window.exportarPessoasCSV = exportarPessoasCSV;
window.imprimirRelatorioPessoas = imprimirRelatorioPessoas;
window.copiarTextoClipboard = copiarTextoClipboard;
window.onPessoaEmpresaSelecionada = onPessoaEmpresaSelecionada;
window.abrirPerfilEmpresaPorCodigo = abrirPerfilEmpresaPorCodigo;
window.abrirEnvioEmailPessoa = abrirEnvioEmailPessoa;
window.renderizarPessoasNoModalCliente = renderizarPessoasNoModalCliente;
