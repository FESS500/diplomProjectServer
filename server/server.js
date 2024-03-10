const express = require('express');//подключение экспресс
const mysql2 = require('mysql2/promise');//подключение базы данных
const app = express();// само приложение экспресс
const cors = require('cors');//для разрешения отправки данных в реакт
const multer = require('multer');//для загрузки картинок продуктов
const path = require('path'); // Импорт модуля path для работы с путями


app.use(cors());//чтобы реакт мог взаимодействовать с экспресс изза безопасности cors
//добавляет заголовки cors к ответам сервера для разрешения доступа к ресурсам с другого домена
app.use(express.json());//анализ тела запроса в формате json и преобразование в доступный объект req

app.use(express.urlencoded({ extended: true }));//для получения данных из форм (вложенные объекты и массивы)

const PORT = 3001;//порт на котором будет работать экспресс
app.listen(PORT, () => {
  console.log(`Сервер запущен на ${PORT} порту`);//прослушиваем порт и выдаем в консоль что он запущен
});

const pool = mysql2.createPool({//созаем пул подключений к базе данных
  host: 'localhost',
  user: 'root',
  database: 'dataBase',
  password: ''
});

const storage = multer.diskStorage({//куда храним файлы
  destination: function (req, file, cb) {
    cb(null, path.resolve(__dirname, 'download/')); // абсолютный путь к папке загрузки
  },
  filename: function (req, file, cb) {//определяет имя файла
    console.log('Original filename:', file.originalname); // Выводим оригинальное имя файла в консоль
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });//создаем экземпляр multer в объекте storage
//он предоставляет методы для загрузки файлов на сервер


app.get('/', async (req, res) => {
  //маршрут для пользователя (отображение из базы данных в реакт из таблицы product)
  try {
    const connection = await pool.getConnection();//получаем соединение с базой данных
    const [rows, fields] = await connection.execute('SELECT * FROM product');
    //выполняется запрос к базе данных по соединению connection выбор всех записей из product
    //rows - элемент строки результата запроса
    //fields - описание столбцов
    connection.release();//освобождение соединения

    const productsWithImagePath = rows.map(product => ({//преобразование с добавлением каждому продукту пути к изображению
      ...product,
      image: `download/${product.image}` //объединение строки с download с именем изображения из табkицы product
    }));//будет содержать данные + путь к изоражению

    res.json(productsWithImagePath);//
  } catch (error) {
    console.error('Ошибка получения данных из базы данных:', error);
    res.status(500).json({ error: 'Ошибка получения данных из базы данных' });
  }
});

app.post('/admin', upload.single('image'), async (req, res) => {
  const { titleProduct, overview, price, avability } = req.body;//для извлечения полей
  const originalFileName = req.file.originalname;//извлечение оригинального имени файла
  try {
      // заполнены все необходимые поля?
      if (!titleProduct || !overview || !price || !avability) {
        throw new Error('Все поля должны быть заполнены');
      }
        
      const imagePath = originalFileName;// Получаем путь к загруженному изображению
  
      // Обработка запроса и вставка данных в базу данных
      const connection = await pool.getConnection();//получаем соединение с базой данных
      //вставка новой записи в таблицу
      const sql = 'INSERT INTO product (titleProduct, overview, price, avability, image) VALUES (?, ?, ?, ?, ?)';
      const values = [titleProduct, overview, price, avability, imagePath];
      await connection.execute(sql, values);//запрос в БД
      console.log('Данные успешно добавлены в базу данных');
      connection.release();//освобождение соединения
  
      res.json({ message: 'Данные успешно добавлены в базу данных' });
    } catch (error) {
      console.error('Ошибка при добавлении данных в базу данных:', error);
      res.status(500).json({ error: 'Ошибка при добавлении данных в базу данных' });
    }
});

app.delete('/admin/:productId', async (req, res) => {//удаление
  const productId = req.params.productId; // Получаем идентификатор продукта из URL
  try {
    // Выполняем запрос на удаление продукта из базы данных
    const connection = await pool.getConnection();//получаем соединение с базой данных
    const sql = 'DELETE FROM product WHERE id = ?'; // по полю id
    await connection.execute(sql, [productId]);//запрос на удаление
    connection.release();//освобождение соединения

    console.log('Продукт успешно удален из базы данных');
    res.json({ message: 'Продукт успешно удален из базы данных' });
  } catch (error) {
    console.error('Ошибка при удалении продукта из базы данных:', error);
    res.status(500).json({ error: 'Ошибка при удалении продукта из базы данных' });
  }//проверка на ошибки
});

// Обработчик метода PUT для обновления данных продукта
app.put('/admin/:productId', async (req, res) => {
  const productId = req.params.productId;//извлекает значение параметра productId из URL запроса
  const { titleProduct, overview, price, avability } = req.body;//для извлечения полей

  try {
      // Выполняем запрос на обновление продукта в базе данных
      const connection = await pool.getConnection();//получаем соединение с базой данных
      //запрос в базу данных для обновления
      const sql = 'UPDATE product SET titleProduct = ?, overview = ?, price = ?, avability = ? WHERE id = ?';
      //готовится массив данных для отправки в базу данных
      const values = [titleProduct, overview, price, avability, productId];
      await connection.execute(sql, values);//выполняется sql запрос
      connection.release();//закрытие соединения после выполнения

      console.log('Продукт успешно обновлен в базе данных');
      res.json({ message: 'Продукт успешно обновлен в базе данных' });
  } catch (error) {
      console.error('Ошибка при обновлении продукта в базе данных:', error);
      res.status(500).json({ error: 'Ошибка при обновлении продукта в базе данных' });
  }
});





app.use('/download', express.static('download'));


