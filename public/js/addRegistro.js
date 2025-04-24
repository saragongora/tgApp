function adicionarItem(inputId, containerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  const valor = input.value.trim();
  if (!valor) return;

  const index = container.children.length;

  const div = document.createElement('div');
  div.className = containerId.includes('aluno') ? 'aluno-item' : 'orientador-item';
  div.innerHTML = `
    <span>${valor}</span>
    <button type="button" class="remove-item" onclick="removerItem('${containerId}', ${index})">x</button>
  `;
  container.appendChild(div);
  input.value = '';

  atualizarInputsOcultos();
}

function removerItem(containerId, index) {
  const container = document.getElementById(containerId);
  if (container.children[index]) container.removeChild(container.children[index]);
  atualizarInputsOcultos();
}

function atualizarInputsOcultos() {
  const inputsDiv = document.getElementById('inputsOcultos');
  inputsDiv.innerHTML = '';

  const alunos = Array.from(document.getElementById('alunosContainer').children);
  const orientadores = Array.from(document.getElementById('orientadoresContainer').children);

  alunos.forEach(div => {
    const nome = div.querySelector('span').textContent;
    inputsDiv.innerHTML += `<input type="hidden" name="alunos" value="${nome}">`;
  });

  orientadores.forEach(div => {
    const nome = div.querySelector('span').textContent;
    inputsDiv.innerHTML += `<input type="hidden" name="orientadores" value="${nome}">`;
  });
}

// Atualiza ao carregar a página (para os registros carregados já existentes)
document.addEventListener('DOMContentLoaded', atualizarInputsOcultos);
