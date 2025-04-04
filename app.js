import { CONFIG } from "./config.js";
import { recipes } from "./database.js";

let currentRecipeIndex = 0;
let currentGoal = "";

document.getElementById("dietForm").addEventListener("submit", handleSubmit);
document.getElementById("loadMore").addEventListener("click", loadMoreRecipes);

function createPasswordModal() {
  const modal = document.createElement("div");
  modal.className = "password-modal";
  modal.innerHTML = `
        <div class="password-content">
            <h3>Verificação de Acesso</h3>
            <input type="password" id="password-input" placeholder="Digite a senha" class="form-control">
            <div id="password-error" class="password-error hidden">Senha incorreta</div>
            <button id="submit-password">Verificar</button>
            <div class="buy-password">
                <p>Não tens senha?</p>
                <a href="https://pay.hotmart.com/B98829339D" target="_blank" class="buy-password-btn">
                    Comprar senha
                </a>
            </div>
        </div>
    `;
  return modal;
}

function verifyPassword(formData) {
  return new Promise((resolve, reject) => {
    const modal = createPasswordModal();
    document.body.appendChild(modal);

    const passwordInput = modal.querySelector("#password-input");
    const submitBtn = modal.querySelector("#submit-password");
    const errorDiv = modal.querySelector("#password-error");

    submitBtn.addEventListener("click", () => {
      if (passwordInput.value === "123") {
        document.body.removeChild(modal);
        resolve(formData);
      } else {
        errorDiv.classList.remove("hidden");
        passwordInput.value = "";
      }
    });

    passwordInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        submitBtn.click();
      }
    });
  });
}

async function handleSubmit(e) {
  e.preventDefault();

  const formData = {
    goal: document.querySelector('input[name="goal"]:checked').value,
    weight: parseFloat(document.getElementById("weight").value),
    time: parseInt(document.getElementById("time").value),
    timeUnit: document.getElementById("timeUnit").value,
  };

  if (!validateInputs(formData.weight, formData.time, formData.timeUnit)) {
    alert("Por favor, verifique os valores inseridos");
    return;
  }

  try {
    await verifyPassword(formData);

    currentGoal = formData.goal;
    currentRecipeIndex = 0;

    document.getElementById("alert").classList.remove("hidden");
    document.getElementById("recipes").innerHTML = "";
    document.getElementById("loadMore").classList.remove("hidden");

    loadMoreRecipes();
  } catch (error) {
    console.error("Verificação falhou:", error);
  }
}

function validateInputs(weight, time, timeUnit) {
  if (weight < CONFIG.WEIGHT_LIMITS.min || weight > CONFIG.WEIGHT_LIMITS.max) {
    return false;
  }

  const timeLimit = CONFIG.TIME_LIMITS[timeUnit];
  if (time < timeLimit.min || time > timeLimit.max) {
    return false;
  }

  return true;
}

function calculateEfficiency(recipe, weight, time, timeUnit) {
  const daysTotal = timeUnit === "weeks" ? time * 7 : time;
  const weightPerDay = weight / daysTotal;

  let baseEfficiency =
    currentGoal === "lose"
      ? recipe.calories < 400
        ? 90
        : 70
      : recipe.calories > 500
      ? 90
      : 70;

  const proteinBonus = recipe.protein > 30 ? 5 : 0;

  let finalEfficiency = baseEfficiency + proteinBonus;

  if (weightPerDay > 0.5) {
    finalEfficiency *= 0.8; // Reduz eficiência para metas muito ambiciosas
  }

  return Math.min(
    Math.max(finalEfficiency, CONFIG.MIN_EFFICIENCY),
    CONFIG.MAX_EFFICIENCY
  );
}

function loadMoreRecipes() {
  const recipesContainer = document.getElementById("recipes");
  const recipesData = recipes[currentGoal];

  for (let i = 0; i < CONFIG.RECIPES_PER_LOAD; i++) {
    if (currentRecipeIndex >= recipesData.length) {
      document.getElementById("loadMore").classList.add("hidden");
      return;
    }

    const recipe = recipesData[currentRecipeIndex];
    const weight = parseFloat(document.getElementById("weight").value);
    const time = parseInt(document.getElementById("time").value);
    const timeUnit = document.getElementById("timeUnit").value;

    const efficiency = calculateEfficiency(recipe, weight, time, timeUnit);

    const recipeElement = createRecipeCard(recipe, efficiency);
    recipesContainer.appendChild(recipeElement);

    currentRecipeIndex++;
  }
}

function createRecipeCard(recipe, efficiency) {
  const card = document.createElement("div");
  card.className = "recipe-card";

  card.innerHTML = `
        <div class="recipe-header">
            <h2 class="recipe-title">${recipe.title}</h2>
            <span class="efficiency">${efficiency.toFixed(1)}% eficiente</span>
        </div>
        
        <div class="ingredients">
            <h3>Ingredientes:</h3>
            <ul>
                ${recipe.ingredients.map((ing) => `<li>${ing}</li>`).join("")}
            </ul>
        </div>
        
        <div class="instructions">
            <h3>Modo de Preparo:</h3>
            <ol>
                ${recipe.instructions
                  .map((inst) => `<li>${inst}</li>`)
                  .join("")}
            </ol>
        </div>
        
        <div class="nutrition">
            <h3>Informações Nutricionais:</h3>
            <p>${recipe.nutrition}</p>
            <p>Calorias: ${recipe.calories} | Proteínas: ${
    recipe.protein
  }g | Carboidratos: ${recipe.carbs}g | Gorduras: ${recipe.fats}g</p>
        </div>
    `;

  return card;
}
