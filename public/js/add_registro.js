function adicionarItem(inputId, containerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  const valor = input.value.trim();
  if (!valor) return;

  const div = document.createElement('div');
  div.className = containerId.includes('aluno') ? 'aluno-item' : 'orientador-item';

  const span = document.createElement('span');
  span.textContent = valor;

  const btnRemover = document.createElement('button');
  btnRemover.type = 'button';
  btnRemover.textContent = 'x';
  btnRemover.className = 'remove-item';

  // ⬇ Aqui está o segredo: remove o próprio pai
  btnRemover.addEventListener('click', function () {
    container.removeChild(div);
    atualizarInputsOcultos();
  });

  div.appendChild(span);
  div.appendChild(btnRemover);
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

document.addEventListener('DOMContentLoaded', () => {
  const botõesRemover = document.querySelectorAll('.remove-item');
  botõesRemover.forEach(botão => {
    botão.addEventListener('click', function () {
      const div = this.parentElement;
      div.parentElement.removeChild(div);
      atualizarInputsOcultos();
    });
  });

  // Captura Enter no campo de orientador
  const orientadorInput = document.getElementById('orientadorInput');
  orientadorInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita o envio do formulário
      adicionarItem('orientadorInput', 'orientadoresContainer');
    }
  });

  // Captura Enter no campo de aluno
  const alunoInput = document.getElementById('alunoInput');
  alunoInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita o envio do formulário
      adicionarItem('alunoInput', 'alunosContainer');
    }
  });

});


let avisoAlunoExibido = false;
let avisoOrientadorExibido = false;

document.getElementById('formRegistro').addEventListener('submit', function (e) {
  atualizarInputsOcultos();

  const alunoInput = document.getElementById('alunoInput');
  const orientadorInput = document.getElementById('orientadorInput');
  const tooltipAluno = document.getElementById('tooltipAluno');
  const tooltipOrientador = document.getElementById('tooltipOrientador');

  let impedirEnvio = false;

  if (alunoInput.value.trim() !== '' && !avisoAlunoExibido) {
    tooltipAluno.style.display = 'block';
    impedirEnvio = true;
    avisoAlunoExibido = true;
  } else {
    tooltipAluno.style.display = 'none';
  }

  if (orientadorInput.value.trim() !== '' && !avisoOrientadorExibido) {
    tooltipOrientador.style.display = 'block';
    impedirEnvio = true;
    avisoOrientadorExibido = true;
  } else {
    tooltipOrientador.style.display = 'none';
  }

  if (impedirEnvio) {
    e.preventDefault();
  }
});


document.addEventListener('DOMContentLoaded', atualizarInputsOcultos);
