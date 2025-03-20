// Отримання елементів DOM
const input = document.getElementById("inputText");
const btn = document.getElementById("applyBtn");
const container = document.getElementById("container");
const selectionRect = document.getElementById("selection-rect");

// Глобальні змінні для перетягування/розкидання
let isDragging = false;
let scatterMode = false;
let dragGroup = []; // група елементів для переміщення
let groupStartMouse = { x: 0, y: 0 };

// Обробка кнопки "Застосувати": розбивання тексту на слова та літери
btn.addEventListener("click", () => {
  container.innerHTML = "";
  const text = input.value;
  // Розбиваємо текст на слова (розділителем — пробіл)
  const words = text.split(" ");
  let xOffset = 0; // координата для розташування літер
  let wordIndex = 0;
  words.forEach((word) => {
    for (let i = 0; i < word.length; i++) {
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = word[i];
      // Присвоєння індексу слова для групування літер
      span.dataset.wordIndex = wordIndex;
      span.style.left = xOffset + "px";
      span.style.top = "0px";
      container.appendChild(span);
      // Додаємо обробники подій для перетягування та кліку (виділення)
      span.addEventListener("mousedown", letterMouseDown);
      span.addEventListener("click", letterClick);
      xOffset += 20; // розташовуємо літери з невеликим зсувом
    }
    // Збільшуємо відступ для розділення слів
    xOffset += 20;
    wordIndex++;
  });
});

// Обробка кліку: при натисканні з Ctrl перемикаємо клас виділення та фон літери
function letterClick(e) {
  console.log(e.metaKey);
  if (e.metaKey) {
    e.target.classList.toggle("selected");
    if (e.target.classList.contains("selected")) {
      e.target.style.backgroundColor = "yellow";
    } else {
      e.target.style.backgroundColor = "";
    }
    e.stopPropagation();
  }
}

// Обробка mousedown для перетягування літери або групи
function letterMouseDown(e) {
  // Якщо натиснуто Ctrl – не починати перетягування (залишається лише виділення)
  if (e.metaKey) return;

  // Якщо натиснута клавіша Shift – запускаємо режим розкидання (для слова)
  if (e.shiftKey) {
    scatterMode = true;
    const wordIdx = e.target.dataset.wordIndex;
    dragGroup = Array.from(
      document.querySelectorAll(`.letter[data-word-index='${wordIdx}']`)
    );
  } else {
    // Якщо літера вже виділена – беремо групу виділених,
    // інакше – перетягуємо лише поточну літеру
    if (e.target.classList.contains("selected")) {
      dragGroup = Array.from(document.querySelectorAll(".letter.selected"));
    } else {
      // Якщо поточна літера не виділена, знімаємо виділення з усіх і вибираємо лише її
      document.querySelectorAll(".letter.selected").forEach((letter) => {
        letter.classList.remove("selected");
        letter.style.backgroundColor = "";
      });
      dragGroup = [e.target];
    }
  }

  isDragging = true;
  groupStartMouse = { x: e.clientX, y: e.clientY };
  // Фіксуємо початкові координати для кожної літери з групи
  dragGroup.forEach((letter) => {
    letter.dataset.startLeft = parseInt(letter.style.left, 10);
    letter.dataset.startTop = parseInt(letter.style.top, 10);
  });

  document.addEventListener("mousemove", groupMouseMove);
  document.addEventListener("mouseup", groupMouseUp);
  e.preventDefault();
  e.stopPropagation();
}

// Рух групи літер за курсором
function groupMouseMove(e) {
  if (!isDragging) return;
  const dx = e.clientX - groupStartMouse.x;
  const dy = e.clientY - groupStartMouse.y;

  dragGroup.forEach((letter) => {
    const newLeft = parseInt(letter.dataset.startLeft) + dx;
    const newTop = parseInt(letter.dataset.startTop) + dy;
    letter.style.left = newLeft + "px";
    letter.style.top = newTop + "px";
  });
}

// Завершення перетягування/розкидання
function groupMouseUp(e) {
  if (!isDragging) return;
  isDragging = false;
  document.removeEventListener("mousemove", groupMouseMove);
  document.removeEventListener("mouseup", groupMouseUp);

  if (scatterMode) {
    // Режим розкидання: кожна літера з групи отримує випадкову позицію по документу
    dragGroup.forEach((letter) => {
      const randomX =
        Math.random() *
        (document.documentElement.clientWidth - letter.offsetWidth);
      const randomY =
        Math.random() *
        (document.documentElement.clientHeight - letter.offsetHeight);
      letter.style.left = randomX + "px";
      letter.style.top = randomY + "px";
    });
    scatterMode = false;
  } else if (dragGroup.length === 1) {
    // Якщо перетягується лише одна літера – перевірка на можливий обмін позиціями,
    // якщо вона опущена на позиції іншої літери
    const draggedLetter = dragGroup[0];
    const draggedRect = draggedLetter.getBoundingClientRect();
    let swapFound = false;
    document.querySelectorAll(".letter").forEach((letter) => {
      if (letter === draggedLetter) return;
      const letterRect = letter.getBoundingClientRect();
      if (intersectRect(draggedRect, letterRect) && !swapFound) {
        swapFound = true;
        const prevLeft = draggedLetter.dataset.startLeft;
        const prevTop = draggedLetter.dataset.startTop;
        const otherLeft = parseInt(letter.style.left, 10);
        const otherTop = parseInt(letter.style.top, 10);
        // Обмін позиціями
        draggedLetter.style.left = otherLeft + "px";
        draggedLetter.style.top = otherTop + "px";
        letter.style.left = prevLeft + "px";
        letter.style.top = prevTop + "px";
      }
    });
  }
  // Для груп (більше однієї літери), позиції вже оновлено при переміщенні
  dragGroup = [];
}

// Функція перевірки перетину двох прямокутників
function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

// ===== Реалізація виділення прямокутником =====
let isSelecting = false;
let selectStart = { x: 0, y: 0 };

container.addEventListener("mousedown", function (e) {
  // Якщо клік на контейнері, але не на літері, запускаємо режим виділення
  if (e.target === container) {
    isSelecting = true;

    selectStart = { x: e.clientX, y: e.clientY };
    selectionRect.style.left = selectStart.x + "px";
    selectionRect.style.top = selectStart.y + "px";
    selectionRect.style.width = "0px";
    selectionRect.style.height = "0px";
    selectionRect.style.display = "block";
    selectionRect.style.opacity = "1";
  }
});

document.addEventListener("mousemove", function (e) {
  if (isSelecting) {
    const currentX = e.clientX;
    const currentY = e.clientY;
    const rectLeft = Math.min(selectStart.x, currentX);
    const rectTop = Math.min(selectStart.y, currentY);
    const rectWidth = Math.abs(selectStart.x - currentX);
    const rectHeight = Math.abs(selectStart.y - currentY);
    selectionRect.style.left = rectLeft + "px";
    selectionRect.style.top = rectTop + "px";
    selectionRect.style.width = rectWidth + "px";
    selectionRect.style.height = rectHeight + "px";
  }
});

document.addEventListener("mouseup", function (e) {
  if (isSelecting) {
    isSelecting = false;
    selectionRect.style.opacity = "0";
    const rect = selectionRect.getBoundingClientRect();
    document.querySelectorAll(".letter").forEach((letter) => {
      console.log(letter);
      const letterRect = letter.getBoundingClientRect();
      console.log(letterRect);
      console.log(rect);
      if (intersectRect(rect, letterRect)) {
        console.log(letter);
        // Якщо літера вже виділена, знімаємо виділення, інакше додаємо
        if (letter.classList.contains("selected")) {
          letter.classList.remove("selected");
          letter.style.backgroundColor = "";
        } else {
          letter.classList.add("selected");
          letter.style.backgroundColor = "yellow";
        }
      }
    });
  }
});
