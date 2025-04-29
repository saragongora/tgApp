document.addEventListener('DOMContentLoaded', function() {
  const searchIcon = document.getElementById('searchIcon');
  const searchForm = document.getElementById('searchForm');

  // Submete o formulário ao clicar na lupa
  if (searchIcon && searchForm) {
    searchIcon.addEventListener('click', function() {
      searchForm.submit();
    });
  }

  // Adiciona a classe "top" se houver resultados
  const searchArea = document.getElementById('searchArea');
  const resultados = document.querySelector('.resultados');
  const temResultados = resultados && resultados.children.length > 0;

  if (temResultados) {
    searchArea.classList.add('top');
  }
});
