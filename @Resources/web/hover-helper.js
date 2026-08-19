(function(){
  function ensureTooltip(root){
    var tip = root.querySelector('.graph-tooltip');
    if(!tip){
      tip = document.createElement('div');
      tip.className = 'graph-tooltip';
      tip.style.display = 'none';
      root.appendChild(tip);
    }
    return tip;
  }

  function showTooltip(root, title, value){
    try{
      var tip = ensureTooltip(root);
      tip.textContent = title + ': ' + value;
      tip.style.display = 'block';
    }catch{}
  }

  function hideTooltip(root){
    try{
      var tip = root.querySelector('.graph-tooltip');
      if(tip) tip.style.display = 'none';
    }catch{}
  }

  function dimAllExcept(root, path){
    try{
      root.classList.add('dimmed');
      root.querySelectorAll('path').forEach(function(p){ p.classList.remove('graph-highlight'); });
      if(path) path.classList.add('graph-highlight');
    }catch{}
  }

  function clear(root){
    try{
      root.classList.remove('dimmed');
      root.querySelectorAll('path').forEach(function(p){ p.classList.remove('graph-highlight'); });
      hideTooltip(root);
    }catch{}
  }

  window.HoverHelper = { showTooltip, hideTooltip, dimAllExcept, clear };
})();