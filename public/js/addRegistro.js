function adicionarItem(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    const nome = input.value.trim();
    if (!nome) return;
  
    const div = document.createElement('div');
    div.className = 'item-listado';
    div.innerHTML = `
      <input type="hidden" name="${inputId}Lista[]" value="${nome}">
      ${nome} <button type="button" class="btn-remove" onclick="this.parentNode.remove()">x</button>
    `;
    container.appendChild(div);
    input.value = '';
  }
  