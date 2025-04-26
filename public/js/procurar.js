document.addEventListener('DOMContentLoaded', function() {
    const searchIcon = document.getElementById('searchIcon');
    const searchForm = document.getElementById('searchForm');
  
    if (searchIcon && searchForm) {
      searchIcon.addEventListener('click', function() {
        searchForm.submit();
      });
    }
  });
  