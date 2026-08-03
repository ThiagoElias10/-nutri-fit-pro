const paises = [
  "Brasil", "Argentina", "Canadá", "Estados Unidos",
  "México", "Japão", "Alemanha", "França",
  "Itália", "Espanha", "Portugal", "Austrália",
  "Inglaterra", "China", "Coreia do Sul", "Índia"
];

function listarPaises() {
  const lista = document.getElementById("listaPaises");
  const total = document.getElementById("total");

  lista.innerHTML = "";

  for (let i = 0; i < paises.length; i++) {
    lista.innerHTML += "<li>" + paises[i] + "</li>";
  }

  total.textContent = "Total de países cadastrados: " + paises.length;
}

document.getElementById("btnMostrar").addEventListener("click", listarPaises);
