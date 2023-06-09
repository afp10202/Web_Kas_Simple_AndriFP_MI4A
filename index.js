//use path module
const path = require('path');
//use express module
const express = require('express');
//use hbs view engine
const hbs = require('hbs');
//use bodyParser middleware
const bodyParser = require('body-parser');
//use mysql database
const mysql = require('mysql');

// const bcrypt = require('bcrypt');
// const session = require('express-session');


const app = express();

//konfigurasi koneksi
const conn = mysql.createConnection({
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12619671',
  password: 'FT9Ysirkiu',
  database: 'sql12619671'
});

//connect ke database
conn.connect((err) => {
  if (err) throw err;
  console.log('Mysql Connected...');
});

//set views file
app.set('views', path.join(__dirname, 'views'));
//set view engine
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//set folder public sebagai static folder untuk static file
app.use('/assets', express.static(path.join(__dirname, 'public')));

hbs.registerHelper('inc', function (value, options) {
  return parseInt(value) + 1;
});

// formatDate
hbs.registerHelper('formatDate', function (date) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
  });
  return formattedDate;
});

hbs.registerHelper('formatRupiah', function(saldo) {
  let rupiah = 'Rp' + saldo.toLocaleString('id-ID');
  return rupiah;
});


/////////////////////
//LOGIN & LOGOUT////
////////////////////

// app.use(session({
//   secret: 'secret',
//   resave: false,
//   saveUninitialized: false,
// }));

// // Middleware untuk memeriksa autentikasi pengguna
// function requireLogin(req, res, next) {
//   if (req.session.user) {
//     // Pengguna sudah diautentikasi, lanjutkan ke rute berikutnya
//     next();
//   } else {
//     // Pengguna belum diautentikasi, redirect ke halaman login
//     res.redirect('/login');
//   }
// }

// // Rute root untuk halaman login
// app.get('/', (req, res) => {
//   res.render('login');
// });

// // Rute untuk halaman login
// app.get('/login', (req, res) => {
//   res.render('login');
// });

// // Rute untuk proses login
// app.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   // Cari pengguna berdasarkan username
//   conn.query('SELECT * FROM tbl_user WHERE username = ?', [username], (err, results) => {
//       if (err) {
//           console.error('Terjadi kesalahan saat mencari pengguna:', err);
//           res.render('login', { error: 'Terjadi kesalahan. Silakan coba lagi.' });
//       } else {
//           // Periksa apakah pengguna ditemukan
//           if (results.length > 0) {
//               const user = results[0];

//               // Periksa kecocokan password
//               bcrypt.compare(password, user.password, (err, isMatch) => {
//                   if (err) {
//                       console.error('Terjadi kesalahan saat memeriksa password:', err);
//                       res.render('login', { error: 'Terjadi kesalahan. Silakan coba lagi.' });
//                   } else if (isMatch) {
//                       // Set session untuk pengguna yang berhasil login
//                       req.session.user = user;

//                       res.redirect('/dashboard');
//                   } else {
//                       res.render('login', { error: 'Password salah. Silakan coba lagi.' });
//                   }
//               });
//           } else {
//               res.render('login', { error: 'Pengguna tidak ditemukan.' });
//           }
//       }
//   });
// });


// // Rute untuk logout
// app.get('/logout', (req, res) => {
//   // Hapus session pengguna
//   req.session.destroy();
//   res.redirect('/login');
// });



// Route untuk homepage
app.get('/',(req, res) => {
  let sql = "SELECT * FROM tbl_transaksi";
  let query = conn.query(sql, (err, results) => {
    if (err) throw err;

    // Calculate total saldo
    let totalSaldo = 0;
    let saldoMasuk = 0;
    let saldoKeluar = 0;
    for (let i = 0; i < results.length; i++) {
      totalSaldo += results[i].saldo;
      saldoMasuk += results[i].kas_masuk;
      saldoKeluar += results[i].kas_keluar;
    }

    // const user = req.session.user;

    res.render('dashboard', {
      saldoMasuk: saldoMasuk,
      saldoKeluar: saldoKeluar,
      totalSaldo: totalSaldo,
      // user
    });
  });
});

////////////////////////////////////////////////////
//KAS MASUK

app.get('/kas-masuk', (req, res) => {
  // query untuk data no buti terakhir
  let sql = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_keluar IS NULL OR tbl_transaksi.kas_keluar = '' ORDER BY no_bukti DESC";
  // query untuk menampilkan data kedalam tabel
  let sql2 = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_keluar IS NULL OR tbl_transaksi.kas_keluar = '' ORDER BY no_bukti ASC";

  conn.query(sql, (err, results) => {
      if (err) {
          console.error('Error saat mengambil data nomor bukti:', err);
          throw err;
      }

      let lastBuktiNumber = results.length > 0 ? results[0].no_bukti : 'BKM-000';
      let counter = parseInt(lastBuktiNumber.split('-')[1]) + 1;
      const buktiNumber = 'BKM-' + counter.toString().padStart(3, '0');

      conn.query(sql2, (err, data) => {
          if (err) {
              console.error('Error saat mengambil data untuk tabel:', err);
              throw err;
          }

          let sqlAkun = "SELECT no_akun, nm_akun FROM tbl_akun";
          conn.query(sqlAkun, (err, options) => {
              if (err) {
                  console.error('Error saat mengambil data akun:', err);
                  throw err;
              }

              res.render('kas-masuk', {
                  results: data,
                  options: options,
                  buktiNumber: buktiNumber,
              
              });
          });
      });
  });
});

app.post('/addKasmasuk', (req, res) => {
  let data = {
      tgl: req.body.tgl,
      no_bukti: req.body.no_bukti,
      tujuan: req.body.tujuan,
      no_akun: req.body.no_akun,
      jumlah: req.body.jumlah,
      tipe: "DEBET",
      kas_masuk: req.body.jumlah, // Jumlah kas masuk
      kas_keluar: 0 // Kas keluar diatur menjadi 0
  };

  // Mengambil saldo saat ini dari transaksi terakhir
  let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
  conn.query(getSaldoQuery, (err, result) => {
      if (err) {
          console.error('Error saat mengambil saldo:', err);
          throw err;
      }

      let saldo = 0;
      if (result.length > 0) {
          saldo = result[0].saldo; // Nilai saldo saat ini
      }

      let jumlahKasMasuk = parseInt(req.body.jumlah);

      // Memperbarui saldo dengan menambahkan jumlah kas masuk
      let updatedSaldo = saldo + jumlahKasMasuk;

      // Menyimpan data transaksi kas masuk dan memperbarui saldo
      let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
      conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
          if (err) {
              console.error('Error saat menyimpan data:', err);
              throw err;
          }
          res.redirect('/kas-masuk');
      });
  });
});

app.post('/editKasmasuk', function(req, res) {
  var no_bukti = req.body.no_bukti;
  var tgl = req.body.tgl;
  var no_akun = req.body.no_akun;
  var tujuan = req.body.tujuan;
  var jumlah = req.body.jumlah;

  // Lakukan proses update data transaksi di database
  var sql = "UPDATE tbl_transaksi SET tgl = ?, no_akun = ?, tujuan = ?, jumlah = ?, kas_masuk = ? WHERE no_bukti = ?";
  conn.query(sql, [tgl, no_akun, tujuan, jumlah, jumlah, no_bukti], function(err, result) {
    if (err) throw err;
    console.log("Data transaksi berhasil diubah");
    res.redirect('/kas-masuk');
  });
});

// menghapus data kas masuk
app.post('/deleteKasmasuk', (req, res) => {
  const no_bukti = req.body.no_bukti;

  // Lakukan logika penghapusan data sesuai dengan no_bukti yang diterima
  let sql = "DELETE FROM tbl_transaksi WHERE no_bukti=?";
  let data = [no_bukti];

  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/kas-masuk');
  });
});



///////////////////////////////////////
//KAS KELUAR
// menampilkan data table kas keluar
app.get('/kas-keluar', (req, res) => {
  // query untuk data no bukti terakhir
  let sql = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_masuk IS NULL OR tbl_transaksi.kas_masuk = '' ORDER BY no_bukti DESC";
  // query untuk menampilkan data kedalam tabel
  let sql2 = "SELECT tbl_transaksi.*, tbl_akun.nm_akun FROM tbl_transaksi LEFT JOIN tbl_akun ON tbl_transaksi.no_akun = tbl_akun.no_akun WHERE tbl_transaksi.kas_masuk IS NULL OR tbl_transaksi.kas_masuk = '' ORDER BY no_bukti ASC";

  conn.query(sql, (err, results) => {
      if (err) {
          console.error('Error saat mengambil data nomor bukti:', err);
          throw err;
      }

      let lastBuktiNumber = results.length > 0 ? results[0].no_bukti : 'BKK-000';
      let counter = parseInt(lastBuktiNumber.split('-')[1]) + 1;
      const buktiNumber = 'BKK-' + counter.toString().padStart(3, '0');

      conn.query(sql2, (err, data) => {
          if (err) {
              console.error('Error saat mengambil data untuk tabel:', err);
              throw err;
          }

          let sqlAkun = "SELECT no_akun, nm_akun FROM tbl_akun";
          conn.query(sqlAkun, (err, options) => {
              if (err) {
                  console.error('Error saat mengambil data akun:', err);
                  throw err;
              }
              
              res.render('kas-keluar', {
                  results: data,
                  options: options,
                  buktiNumber: buktiNumber,
              });
          });
      });
  });
});

// route untuk menyimpan kas keluar
app.post('/addKaskeluar', (req, res) => {
  let data = {
      tgl: req.body.tgl,
      no_bukti: req.body.no_bukti,
      tujuan: req.body.tujuan,
      no_akun: req.body.no_akun,
      jumlah: req.body.jumlah,
      tipe: "KREDIT",
      kas_masuk: 0,
      kas_keluar: req.body.jumlah
  };

  // Mengambil saldo saat ini dari transaksi terakhir
  let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
  conn.query(getSaldoQuery, (err, result) => {
      if (err) {
          console.error('Error saat mengambil saldo:', err);
          throw err;
      }

      let saldo = 0;
      if (result.length > 0) {
          saldo = result[0].saldo; // Nilai saldo saat ini
      }

      let jumlahKasKeluar = parseInt(req.body.jumlah);

      // Memperbarui saldo dengan menambahkan jumlah kas masuk
      let updatedSaldo = saldo - jumlahKasKeluar;

      // Menyimpan data transaksi kas masuk dan memperbarui saldo
      let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
      conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
          if (err) {
              console.error('Error saat menyimpan data:', err);
              throw err;
          }
          res.redirect('/kas-keluar');
      });
  });
});

app.post('/editKaskeluar', function(req, res) {
  var no_bukti = req.body.no_bukti;
  var tgl = req.body.tgl;
  var no_akun = req.body.no_akun;
  var tujuan = req.body.tujuan;
  var jumlah = req.body.jumlah;

  // Lakukan proses update data transaksi di database
  var sql = "UPDATE tbl_transaksi SET tgl = ?, no_akun = ?, tujuan = ?, jumlah = ?, kas_keluar = ? WHERE no_bukti = ?";
  conn.query(sql, [tgl, no_akun, tujuan, jumlah, jumlah, no_bukti], function(err, result) {
    if (err) throw err;
    console.log("Data transaksi berhasil diubah");

     // Mengambil saldo saat ini dari transaksi 
     let getSaldoQuery = "SELECT saldo FROM tbl_transaksi ORDER BY id_trans DESC LIMIT 1";
     conn.query(getSaldoQuery, (err, result) => {
      if (err) {
          console.error('Error saat mengambil saldo:', err);
          throw err;
      }

      let saldo = 0;
      if (result.length > 0) {
          saldo = result[0].saldo; // Nilai saldo saat ini
      }

      let jumlahKasKeluar = parseInt(req.body.jumlah);

      // Memperbarui saldo dengan menambahkan jumlah kas masuk
      let updatedSaldo = saldo - jumlahKasKeluar;

      // Menyimpan data transaksi kas masuk dan memperbarui saldo
      let updateAndInsertQuery = "INSERT INTO tbl_transaksi SET ?, saldo = ?";
      conn.query(updateAndInsertQuery, [data, updatedSaldo], (err, result) => {
          if (err) {
              console.error('Error saat menyimpan data:', err);
              throw err;
          }
          res.redirect('/kas-keluar');
      });
    });
  });
});

// menghapus data kas masuk
app.post('/deleteKaskeluar', (req, res) => {
  const no_bukti = req.body.no_bukti;

  // Lakukan logika penghapusan data sesuai dengan no_bukti yang diterima
  let sql = "DELETE FROM tbl_transaksi WHERE no_bukti=?";
  let data = [no_bukti];

  let query = conn.query(sql, data, (err, results) => {
    if (err) throw err;
    res.redirect('/kas-keluar');
  });
});


//////////////
//DAFTAR AKUN

// Menampilkan halaman 'daftar-akun' dengan data dari tabel tbl_akun
app.get('/daftar-akun', (req, res) => {
  conn.query('SELECT * FROM tbl_akun', (err, results) => {
    if (err) {
      throw err;
    }
    res.render('daftar-akun', { akun: results });
  });
});


//route untuk insert data
app.post('/addAkun', (req, res) => {
  let data = { no_akun: req.body.no_akun, nm_akun: req.body.nm_akun };
  let sql = "INSERT INTO tbl_akun SET ?";
  conn.query(sql, data, (err, results) => {
      if (err) {
          // Tangani jika terjadi error
          console.error('Error updating data:', err);
          return;
      }
      res.redirect('/daftar-akun');
  });
});

app.post('/editAkun', (req, res) => {
  let editdata = {
    no_akun: req.body.no_akun,
    nm_akun: req.body.nm_akun,
    id_akun: req.body.id_akun // Menggunakan req.body.id_akun
  };
  const sql = 'UPDATE tbl_akun SET no_akun = ?, nm_akun = ? WHERE id_akun = ?';
  conn.query(sql, [editdata.no_akun, editdata.nm_akun, editdata.id_akun], (err, result) => {
    if (err) {
      // Tangani jika terjadi error
      console.error('Error updating data:', err);
      return;
    }
    res.redirect('/daftar-akun');
  });
});

// Menghapus akun dari tabel tbl_akun
app.post('/deleteAkun', (req, res) => {
  const { id_akun } = req.body;
  const sql = 'DELETE FROM tbl_akun WHERE id_akun = ?';
  conn.query(sql, [id_akun], (err, result) => {
    if (err) {
      throw err;
    }
    res.redirect('/daftar-akun');
  });
});


///////////LAPORAN/////////////////////

app.get('/laporan', (req, res) => {
  // Mengambil filter dari query string
  const tanggal = req.query.tanggal;
  const bulan = req.query.bulan;
  const tahun = req.query.tahun;

  // Membuat query untuk mengambil data transaksi berdasarkan filter
  let query = 'SELECT * FROM tbl_transaksi';
  if (tanggal) {
    query += ` WHERE tgl = '${tanggal}'`;
  } else if (bulan) {
    query += ` WHERE MONTH(tgl) = ${bulan}`;
  } else if (tahun) {
    query += ` WHERE YEAR(tgl) = ${tahun}`;
  }

  // Menjalankan query untuk mengambil data transaksi
  conn.query(query, (error, results) => {
    if (error) throw error;

    // Kirim data ke halaman 'laporan.hbs'
    res.render('laporan', { results });
  });
});

//server listening
app.listen(8065, () => {
  console.log('Server is running at port 8055');
});
