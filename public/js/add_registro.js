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

  const orientadores = document.querySelectorAll('#orientadoresContainer .orientador-item span');
  orientadores.forEach(orientador => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'orientadores[]';
    input.value = orientador.innerText;
    inputsOcultos.appendChild(input);
  });

  const alunos = document.querySelectorAll('#alunosContainer .aluno-item span');
  alunos.forEach(aluno => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'alunos[]';
    input.value = aluno.innerText;
    inputsOcultos.appendChild(input);
  });
}

const form = document.querySelector('form');
form.addEventListener('submit', function() {
  atualizarInputsOcultos();
});


document.addEventListener('DOMContentLoaded', atualizarInputsOcultos);
