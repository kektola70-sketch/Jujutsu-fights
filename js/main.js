// Инициализация при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    // Создание меню
    window.menu = new Menu();
    
    // Создание игры
    window.game = new Game();
    
    console.log('🎮 Jujutsu Fight загружена!');
    console.log('Управление:');
    console.log('- WASD / Стрелки - движение');
    console.log('- Пробел - удар рукой');
    console.log('- K - удар ногой');
    console.log('- L - спецатака');
    console.log('- Shift - блок');
});