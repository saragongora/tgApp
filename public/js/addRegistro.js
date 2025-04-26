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
  const inputsOcultos = document.getElementById('inputsOcultos');
  inputsOcultos.innerHTML = '';

  // Pegar orientadores
  const orientadores = document.querySelectorAll('#orientadoresContainer .orientador-item span');
  orientadores.forEach(orientador => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'orientadores[]';
    input.value = orientador.innerText;
    inputsOcultos.appendChild(input);
  });

  // Pegar alunos
  const alunos = document.querySelectorAll('#alunosContainer .aluno-item span');
  alunos.forEach(aluno => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'alunos[]';
    input.value = aluno.innerText;
    inputsOcultos.appendChild(input);
  });
}

// Antes de enviar o formulário, atualize os inputs ocultos
const form = document.querySelector('form');
form.addEventListener('submit', function() {
  atualizarInputsOcultos();
});


// Atualiza ao carregar a página (para os registros carregados já existentes)
document.addEventListener('DOMContentLoaded', atualizarInputsOcultos);
