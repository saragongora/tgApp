function adicionarItem(inputId, containerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  const nome = input.value.trim();
  if (!nome) return;

  // Define o name correto com base no inputId
  const nomeCampo = inputId.includes('aluno') ? 'alunos' : 'orientadores';

  const div = document.createElement('div');
  div.className = 'item-listado';
  div.innerHTML = `
    <input type="hidden" name="${nomeCampo}" value="${nome}">
    ${nome} <button type="button" class="btn-remove" onclick="this.parentNode.remove()">x</button>
  `;
  container.appendChild(div);
  input.value = '';
}

  