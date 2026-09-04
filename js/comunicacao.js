// ============================================
// CENTRAL DE COMUNICAÇÃO (ESTILO DE BOTÃO INTERATIVO)
// Linha do tempo unificada, cadência atrasada e registro rápido de contatos
// ============================================

let comVisaoAtiva = 'todas'; // 'todas' | 'atrasados' | 'timeline'
let comCanalSelecionado = ''; // '' (todos) | 'email' | 'whatsapp' | 'ligacao'
let comPeriodoDiasSelecionado = 30; // 7 | 30 | 90 | 0 (tudo)

function popularFiltroVendedorComunicacao() {
    const select = document.getElementById('comFiltroVendedor');
    if (!select) return;
    if (usuarioAtual && usuarioAtual.papel === 'admin') {
        select.style.display = 'inline-block';
        const valorAtual = select.value;
        select.innerHTML = '<option value="">Todos os vendedores</option>' +
            usuarios.map(u => `<option value="${u.id}">${u.nome}</option>`).join('');
        select.value = valorAtual;
    } else {
        select.style.display = 'none';
    }
}

function setComFiltroCanal(canal) {
    comCanalSelecionado = canal;
    const select = document.getElementById('comFiltroCanal');
    if (select) select.value = canal;

    // Atualiza botões segmentados
    const grupo = document.getElementById('comBtnGroupCanal');
    if (grupo) {
        grupo.querySelectorAll('.btn-segmented').forEach(btn => {
            const btnCanal = btn.getAttribute('data-canal') || '';
            btn.classList.toggle('active', btnCanal === canal);
        });
    }

    renderizarComunicacao();
}

function setComFiltroPeriodo(periodoStr) {
    const dias = parseInt(periodoStr) || 0;
    comPeriodoDiasSelecionado = dias;
    const select = document.getElementById('comFiltroPeriodo');
    if (select) select.value = periodoStr;

    // Atualiza botões segmentados
    const grupo = document.getElementById('comBtnGroupPeriodo');
    if (grupo) {
        grupo.querySelectorAll('.btn-segmented').forEach(btn => {
            const btnPeriodo = btn.getAttribute('data-periodo');
            btn.classList.toggle('active', btnPeriodo === String(periodoStr));
        });
    }

    renderizarComunicacao();
}

function alternarSubVisaoComunicacao(visao) {
    comVisaoAtiva = visao;

    const btnTodas = document.getElementById('btnSubVisaoComTodas');
    const btnAtrasados = document.getElementById('btnSubVisaoComAtrasados');
    const btnTimeline = document.getElementById('btnSubVisaoComTimeline');

    if (btnTodas) btnTodas.classList.toggle('active', visao === 'todas');
    if (btnAtrasados) btnAtrasados.classList.toggle('active', visao === 'atrasados');
    if (btnTimeline) btnTimeline.classList.toggle('active', visao === 'timeline');

    const cardResumo = document.getElementById('comunicacaoResumoContainer');
    const cardAtrasados = document.getElementById('cardComunicacaoAtrasados');
    const cardTimeline = document.getElementById('cardComunicacaoTimeline');

    if (visao === 'todas') {
        if (cardResumo) cardResumo.style.display = 'grid';
        if (cardAtrasados) cardAtrasados.style.display = 'block';
        if (cardTimeline) cardTimeline.style.display = 'block';
    } else if (visao === 'atrasados') {
        if (cardResumo) cardResumo.style.display = 'none';
        if (cardAtrasados) cardAtrasados.style.display = 'block';
        if (cardTimeline) cardTimeline.style.display = 'none';
    } else if (visao === 'timeline') {
        if (cardResumo) cardResumo.style.display = 'grid';
        if (cardAtrasados) cardAtrasados.style.display = 'none';
        if (cardTimeline) cardTimeline.style.display = 'block';
    }
}

function getComunicacoesUnificadas() {
    const leadsVisiveis = getLeadsVisiveis();
    const leadsIds = new Set(leadsVisiveis.map(l => l.id));
    const leadMap = {};
    leadsVisiveis.forEach(l => { leadMap[l.id] = l; });

    const itens = [];

    // E-mails
    (emailLog || []).forEach(log => {
        if (!leadsIds.has(log.leadId)) return;
        itens.push({
            id: `email-${log.id || Date.now()}`,
            canal: 'email',
            data: log.data,
            hora: log.hora || '10:00',
            empresa: log.empresa,
            leadId: log.leadId,
            usuarioId: log.usuarioId,
            resumo: log.assunto || '(sem assunto)'
        });
    });

    // WhatsApp
    (whatsappLog || []).forEach(log => {
        if (!leadsIds.has(log.leadId)) return;
        itens.push({
            id: `wa-${log.id || Date.now()}`,
            canal: 'whatsapp',
            data: log.data,
            hora: log.hora || '11:00',
            empresa: log.empresa,
            leadId: log.leadId,
            usuarioId: log.usuarioId,
            resumo: (log.mensagem || '').substring(0, 110) + ((log.mensagem || '').length > 110 ? '...' : '')
        });
    });

    // Histórico de ligações, reuniões e atividades registradas nos leads
    leadsVisiveis.forEach(l => {
        (l.historico || []).forEach((h, idx) => {
            const tipoLower = (h.tipo || '').toLowerCase();
            let canal = 'outro';
            if (tipoLower.includes('ligação') || tipoLower.includes('ligacao') || tipoLower.includes('telefone')) {
                canal = 'ligacao';
            } else if (tipoLower.includes('whatsapp') || tipoLower.includes('whats')) {
                canal = 'whatsapp';
            } else if (tipoLower.includes('email') || tipoLower.includes('e-mail')) {
                canal = 'email';
            } else if (tipoLower.includes('reuni') || tipoLower.includes('visita') || tipoLower.includes('videoconfer')) {
                canal = 'reuniao';
            }

            itens.push({
                id: `hist-${l.id}-${idx}`,
                canal,
                tipoNome: h.tipo || 'Contato',
                data: h.data || (l.dataCriacao || '').split('T')[0],
                hora: h.hora || '14:00',
                empresa: l.empresa,
                leadId: l.id,
                usuarioId: l.usuarioId,
                resumo: h.descricao || '(sem descrição)'
            });
        });
    });

    return itens;
}

function renderizarComunicacao() {
    popularFiltroVendedorComunicacao();

    const canalFiltro = comCanalSelecionado || (document.getElementById('comFiltroCanal')?.value || '');
    const vendedorFiltro = (usuarioAtual && usuarioAtual.papel === 'admin') ? (document.getElementById('comFiltroVendedor')?.value || '') : '';
    const diasFiltro = comPeriodoDiasSelecionado;

    let itens = getComunicacoesUnificadas();

    if (canalFiltro) {
        if (canalFiltro === 'email') itens = itens.filter(i => i.canal === 'email');
        else if (canalFiltro === 'whatsapp') itens = itens.filter(i => i.canal === 'whatsapp');
        else if (canalFiltro === 'ligacao') itens = itens.filter(i => i.canal === 'ligacao');
        else itens = itens.filter(i => i.canal === canalFiltro);
    }

    if (vendedorFiltro) {
        itens = itens.filter(i => i.usuarioId === vendedorFiltro);
    }

    if (diasFiltro > 0) {
        const limite = new Date();
        limite.setDate(limite.getDate() - diasFiltro);
        const limiteStr = limite.toISOString().split('T')[0];
        itens = itens.filter(i => (i.data || '') >= limiteStr);
    }

    itens.sort((a, b) => ((b.data || '') + 'T' + (b.hora || '00:00')).localeCompare((a.data || '') + 'T' + (a.hora || '00:00')));

    const totalEmail = itens.filter(i => i.canal === 'email').length;
    const totalWhatsapp = itens.filter(i => i.canal === 'whatsapp').length;
    const totalLigacoes = itens.filter(i => i.canal === 'ligacao' || i.canal === 'reuniao').length;

    const resumoContainer = document.getElementById('comunicacaoResumoContainer');
    if (resumoContainer) {
        resumoContainer.innerHTML = `
            <div class="resumo-item"><div class="valor">${itens.length}</div><div class="label">Total de Interações</div></div>
            <div class="resumo-item"><div class="valor">${totalEmail}</div><div class="label">E-mails Enviados</div></div>
            <div class="resumo-item"><div class="valor">${totalWhatsapp}</div><div class="label">Mensagens WhatsApp</div></div>
            <div class="resumo-item"><div class="valor">${totalLigacoes}</div><div class="label">Ligações & Reuniões</div></div>
        `;
    }

    const timelineContainer = document.getElementById('comunicacaoTimelineList');
    const countLabel = document.getElementById('timelineCountLabel');
    if (countLabel) {
        countLabel.textContent = `Exibindo ${itens.length} interação(ões)`;
    }

    if (timelineContainer) {
        if (itens.length === 0) {
            timelineContainer.innerHTML = `
                <div class="empty-state compact">
                    <span class="emoji-big"><span data-icone="comunicacao"></span></span>
                    <p class="text-sm">Nenhum contato no período/filtro selecionado.</p>
                    <button class="btn btn-primary btn-xs mt-8" onclick="abrirModalRegistrarContatoRapido()">+ Registrar Primeiro Contato</button>
                </div>
            `;
        } else {
            timelineContainer.innerHTML = itens.slice(0, 150).map(i => {
                const vendedor = usuarios.find(u => u.id === i.usuarioId);
                let iconeNome = 'comunicacao';
                let canalLabel = 'Contato';
                let badgeClass = 'text-muted';

                if (i.canal === 'email') {
                    iconeNome = 'marketing';
                    canalLabel = 'E-mail';
                } else if (i.canal === 'whatsapp') {
                    iconeNome = 'whatsapp';
                    canalLabel = 'WhatsApp';
                } else if (i.canal === 'ligacao') {
                    iconeNome = 'telefone';
                    canalLabel = 'Ligação';
                } else if (i.canal === 'reuniao') {
                    iconeNome = 'calendario';
                    canalLabel = 'Reunião';
                }

                const icone = svgIcone(iconeNome);
                const tagVendedor = (vendedor && usuarioAtual && usuarioAtual.papel === 'admin')
                    ? ` <span class="text-xs text-muted">(${vendedor.nome})</span>` : '';

                return `
                <div class="historico-item" style="display:flex;gap:12px;padding:12px;border-bottom:1px solid var(--border-color);">
                    <div style="width:34px;height:34px;border-radius:8px;background:rgba(45,72,99,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <span class="icon-sm">${icone}</span>
                    </div>
                    <div style="flex:1;">
                        <div class="h-data" style="font-size:12px;color:var(--text-muted);display:flex;justify-content:space-between;">
                            <span>${formatarData(i.data)} ${i.hora || ''}</span>
                            <span class="badge" style="font-size:11px;">${i.tipoNome || canalLabel}</span>
                        </div>
                        <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin:2px 0;">
                            <a href="javascript:void(0)" onclick="abrirModalCliente('${i.leadId}')" style="color:var(--text-primary);text-decoration:none;">
                                ${i.empresa}
                            </a>
                            ${tagVendedor}
                        </div>
                        <div class="h-desc" style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${i.resumo}</div>
                    </div>
                </div>
                `;
            }).join('');
        }
    }

    renderizarContatosAtrasados();
    if (typeof renderizarIcones === 'function') renderizarIcones();
}

// ---------- Cadência atrasada (quem não recebe contato há mais tempo que o limite do potencial) ----------
function calcularContatosAtrasados() {
    if (!usuarioAtual) return [];
    const leadsVisiveis = getLeadsVisiveis();
    const hojeD = new Date();
    const agrupados = {};

    leadsVisiveis.forEach(l => {
        if (l.etapa !== 'pedido' && !l.cliente) return;
        const codigo = l.codigoUnico;
        if (!agrupados[codigo]) {
            agrupados[codigo] = {
                empresa: l.empresa,
                potencial: (l.potencial || 'B').toUpperCase(),
                ultimaData: null,
                leadId: l.id,
                usuarioId: l.usuarioId
            };
        }
        (l.historico || []).forEach(h => {
            if (h.data && (!agrupados[codigo].ultimaData || h.data > agrupados[codigo].ultimaData)) {
                agrupados[codigo].ultimaData = h.data;
            }
        });
    });

    (emailLog || []).forEach(log => {
        const lead = leadsVisiveis.find(l => l.id === log.leadId);
        if (!lead || !agrupados[lead.codigoUnico]) return;
        if (!agrupados[lead.codigoUnico].ultimaData || log.data > agrupados[lead.codigoUnico].ultimaData) {
            agrupados[lead.codigoUnico].ultimaData = log.data;
        }
    });
    (whatsappLog || []).forEach(log => {
        const lead = leadsVisiveis.find(l => l.id === log.leadId);
        if (!lead || !agrupados[lead.codigoUnico]) return;
        if (!agrupados[lead.codigoUnico].ultimaData || log.data > agrupados[lead.codigoUnico].ultimaData) {
            agrupados[lead.codigoUnico].ultimaData = log.data;
        }
    });

    const resultado = [];
    Object.values(agrupados).forEach(c => {
        const limite = DIAS_LIMITE_CONTATO[c.potencial] || DIAS_LIMITE_CONTATO.B;
        const diasSemContato = c.ultimaData
            ? Math.floor((hojeD - new Date(c.ultimaData)) / (1000 * 60 * 60 * 24))
            : null;
        if (diasSemContato === null || diasSemContato >= limite) {
            resultado.push({ ...c, diasSemContato, limite });
        }
    });

    resultado.sort((a, b) => (b.diasSemContato ?? 99999) - (a.diasSemContato ?? 99999));
    return resultado;
}

function renderizarContatosAtrasados() {
    const container = document.getElementById('comunicacaoAtrasadosList');
    const badgeSubAba = document.getElementById('badgeAtrasadosComBtn');
    const atrasados = calcularContatosAtrasados();

    if (badgeSubAba) {
        badgeSubAba.textContent = atrasados.length;
        badgeSubAba.style.display = atrasados.length > 0 ? 'inline-block' : 'none';
    }

    if (!container) return;

    if (atrasados.length === 0) {
        container.innerHTML = `
            <div class="empty-state compact">
                <span class="emoji-big"><span data-icone="lembrete"></span></span>
                <p class="text-sm">Parabéns! Nenhum cliente atrasado na cadência de contato.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = atrasados.map(c => `
        <div class="cadencia-row" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border-color);">
            <div>
                <div style="font-weight:700;font-size:14px;color:var(--text-primary);">
                    <a href="javascript:void(0)" onclick="abrirModalCliente('${c.leadId}')" style="color:var(--text-primary);text-decoration:none;">
                        ${c.empresa}
                    </a>
                    <span class="role-badge ${c.potencial === 'C' ? '' : 'vendedor'}" style="${c.potencial === 'C' ? 'background:#94a3b8;' : ''}">${c.potencial}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
                    ${c.diasSemContato === null ? '⚠️ Nunca contatado' : `⏰ ${c.diasSemContato} dia(s) sem contato (limite esperado: ${c.limite} dias)`}
                </div>
            </div>
            <div class="flex gap-8" style="align-items:center;">
                <button type="button" class="btn btn-outline btn-xs" onclick="abrirModalRegistrarContatoRapido('${c.leadId}')" title="Registrar Contato">
                    <span data-icone="nota"></span> Registrar
                </button>
                <button type="button" class="btn btn-primary btn-xs" onclick="abrirEnvioEmail('${c.leadId}')" title="Enviar e-mail">
                    <span data-icone="marketing"></span> E-mail
                </button>
                <button type="button" class="btn btn-success btn-xs" onclick="abrirEnvioWhatsApp('${c.leadId}')" title="Enviar WhatsApp">
                    <span data-icone="whatsapp"></span> WhatsApp
                </button>
            </div>
        </div>
    `).join('');
}

// --------------------------------------------------------------------------
// MODAL: REGISTRAR CONTATO RÁPIDO (COMUNICAÇÃO MULTI-PESSOAS)
// --------------------------------------------------------------------------
function abrirModalRegistrarContatoRapido(leadIdPadrao) {
    const selectLead = document.getElementById('contatoRapidoLeadId');
    const selectPessoa = document.getElementById('contatoRapidoPessoaId');
    const inputData = document.getElementById('contatoRapidoData');
    const inputHora = document.getElementById('contatoRapidoHora');
    const inputDesc = document.getElementById('contatoRapidoDescricao');
    const inputProx = document.getElementById('contatoRapidoProximaAcao');
    const inputProxData = document.getElementById('contatoRapidoProximaData');

    if (!selectLead) return;

    const leadsVisiveis = getLeadsVisiveis();
    selectLead.innerHTML = '<option value="">-- Selecione a empresa / lead --</option>' +
        leadsVisiveis.map(l => `<option value="${l.id}">${l.empresa} (${l.etapa})</option>`).join('');

    if (leadIdPadrao) {
        selectLead.value = leadIdPadrao;
    }

    const agora = new Date();
    if (inputData) inputData.value = agora.toISOString().split('T')[0];
    if (inputHora) {
        const hh = String(agora.getHours()).padStart(2, '0');
        const mm = String(agora.getMinutes()).padStart(2, '0');
        inputHora.value = `${hh}:${mm}`;
    }
    if (inputDesc) inputDesc.value = '';
    if (inputProx) inputProx.value = '';
    if (inputProxData) inputProxData.value = '';

    aoSelecionarLeadContatoRapido();
    abrirModal('modalRegistrarContatoRapido');
}

function aoSelecionarLeadContatoRapido() {
    const selectLead = document.getElementById('contatoRapidoLeadId');
    const selectPessoa = document.getElementById('contatoRapidoPessoaId');
    if (!selectLead || !selectPessoa) return;

    const leadId = selectLead.value;
    const lead = leads.find(l => l.id === leadId);

    if (!lead) {
        selectPessoa.innerHTML = '<option value="">Decisor principal / Geral</option>';
        return;
    }

    // Busca pessoas mapeadas para este lead ou código único
    const contatosDaEmpresa = (pessoas || []).filter(p => p.codigoUnico === lead.codigoUnico || p.empresa === lead.empresa);

    let html = '<option value="">Decisor principal (' + (lead.decisor || 'Geral') + ')</option>';
    contatosDaEmpresa.forEach(p => {
        html += `<option value="${p.id}">${p.nome} - ${p.titulo || p.setor || 'Contato'}</option>`;
    });

    selectPessoa.innerHTML = html;
}

async function salvarContatoRapido(e) {
    if (e) e.preventDefault();

    const selectLead = document.getElementById('contatoRapidoLeadId');
    const selectCanal = document.getElementById('contatoRapidoCanal');
    const selectPessoa = document.getElementById('contatoRapidoPessoaId');
    const inputData = document.getElementById('contatoRapidoData');
    const inputHora = document.getElementById('contatoRapidoHora');
    const inputDesc = document.getElementById('contatoRapidoDescricao');
    const inputProx = document.getElementById('contatoRapidoProximaAcao');
    const inputProxData = document.getElementById('contatoRapidoProximaData');

    const leadId = selectLead.value;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
        showToast('Selecione uma empresa válida.', 'error');
        return;
    }

    const tipo = selectCanal.value || 'Contato';
    const data = inputData.value || new Date().toISOString().split('T')[0];
    const hora = inputHora.value || '12:00';
    let descricao = (inputDesc.value || '').trim();

    const pessoaId = selectPessoa.value;
    if (pessoaId) {
        const pessoa = (pessoas || []).find(p => p.id === pessoaId);
        if (pessoa) {
            descricao = `[Contato: ${pessoa.nome} - ${pessoa.titulo || pessoa.setor}] ${descricao}`;
        }
    }

    if (!lead.historico) lead.historico = [];
    lead.historico.push({
        data,
        hora,
        tipo,
        descricao
    });

    if (inputProx && inputProx.value.trim()) {
        lead.proximaAcao = inputProx.value.trim();
        lead.proximaData = inputProxData?.value || '';
    }

    fecharModal('modalRegistrarContatoRapido');
    salvarDados();
    renderizarComunicacao();
    atualizarContadores();
    showToast('Interação registrada com sucesso!');
}

window.renderizarComunicacao = renderizarComunicacao;
window.setComFiltroCanal = setComFiltroCanal;
window.setComFiltroPeriodo = setComFiltroPeriodo;
window.alternarSubVisaoComunicacao = alternarSubVisaoComunicacao;
window.abrirModalRegistrarContatoRapido = abrirModalRegistrarContatoRapido;
window.aoSelecionarLeadContatoRapido = aoSelecionarLeadContatoRapido;
window.salvarContatoRapido = salvarContatoRapido;
window.calcularContatosAtrasados = calcularContatosAtrasados;
