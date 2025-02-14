function generarFicheroDfarm(pStrLote, pFacturas) {

	// Obtención de la cantidad de lineas
	let mIntCantidad = Ax.db.executeGet(`
		<select>
			<columns>
				count(*)
			</columns> 
			<from table = 'fas_tedef_dfarm' />
			<where>
				tdfarm_nrolote = ?
                AND tdfarm_nrodocpg IN (${pFacturas})
			</where>
		</select>
	`, pStrLote);

	// Generación del total de caracteres a usar en el archivo txt
	let mIntTamanyo	= mIntCantidad * 140;

	// Declaracion de variables
	let nf			= new Ax.text.NumberFormat("us");
	let documento	= new Ax.text.Line(mIntTamanyo);
	let mPuntero	= 0;

	// Búsqueda de los datos sobre la tabla del fichero
	let mRsDatos	= Ax.db.executeQuery(`
		<select>
			<columns>
				tdfarm_serial,
				tdfarm_nrolote,
				tdfarm_ruc,
				tdfarm_ipress,
				tdfarm_tipodocpg,
				tdfarm_nrodocpg,
				tdfarm_pres,
				tdfarm_corprd,
				tdfarm_tipoprod,
				tdfarm_catalogo,
				tdfarm_codprod,
				tdfarm_fecdisfarm,
				tdfarm_mntvntprod,
				tdfarm_tipunddisp,
				tdfarm_mntuntsimp,
				ROUND(tdfarm_cpgprdfarm, 2) tdfarm_cpgprdfarm,
				tdfarm_mntprdfarm,
				tdfarm_mntncubprd,
				tdfarm_diagprdfar,
				tdfarm_prdexeifv,
				tdfarm_guiafarm,
				tdfarm_liql_id,
				tdfarm_mntunt_round,
				tdfarm_cpgprd_round,
				tdfarm_mntprd_round,
				tdfarm_mntncub_round
			</columns>
			<from table = 'fas_tedef_dfarm' />
			<where>
				tdfarm_nrolote = ?
                AND tdfarm_nrodocpg IN (${pFacturas})
			</where>
			<order>
				tdfarm_nrodocpg ASC
			</order>
		</select>
	`, pStrLote).toMemory();

	/**
	 * Ajustes sobre las lineas: Redondeamos los copagos informados y ajustamos 
	 * la tabla de Atención (Date) de ser necesario
	 */
	mRsDatos.forEach((mRow) => {
		// Obtención de la clave asignada por el tipo de factura
		let mStrTipoDoc = Ax.db.executeGet(`
			<select>
				<columns>
					fvt_clave
				</columns>
				<from table = 'fas_factura_venta_tipo' />
				<where>
					fvt_codigo = ?
				</where>
			</select>
		`, mRow.tdfarm_tipodocpg)

		// Si no existe el tipo, se asigna un 99
		if (!mStrTipoDoc) {
			mStrTipoDoc = '99'
		}

		/**
		 * Ajuste del dato informado según requerimiento de SUSALUD
		 * para que sea informado de manera correcta
		 */
		let mStrPrdExoIgv = '';
		switch (mRow.tdfarm_prdexeifv) {
			case "IGV"			: mStrPrdExoIgv = 'A'; break;
			case "EXONERADO"	: mStrPrdExoIgv = 'D'; break;
			default				: mStrPrdExoIgv = 'A';
		}

		// Si el producto viene en caja se informa el "1" caso contrario 2
		let mIntPrdUnd;
		switch (mRow.tdfarm_tipunddisp) {
			case "CJA"	: mIntPrdUnd = 1; break;
			default		: mIntPrdUnd = 2;
		}

		// Datos para el archivo TXT
		let mDateFecha			= new Ax.util.Date(mRow.tdfarm_fecdisfarm);
		let mStrFact			= mRow.tdfarm_nrodocpg.split('-');
		let mStrFactCompuesta	= mStrFact[0] + '' + mStrFact[1];

		// Inicio del seteado de data en el archivo TXT
		documento
		.add((mPuntero),		mRow.tdfarm_ruc)
		.add((mPuntero+11),		mRow.tdfarm_ipress)
		.add((mPuntero+19),		mStrTipoDoc)
		.add((mPuntero+21),		mStrFactCompuesta)
		.add((mPuntero+33),		('               ' + mRow.tdfarm_pres.replace(/\s/g, '-')).slice(-5))
		.add((mPuntero+38),		('               ' + mRow.tdfarm_corprd.replace(/\s/g, '-')).slice(-4))
		.add((mPuntero+42),		mRow.tdfarm_tipoprod)
		.add((mPuntero+43),		mRow.tdfarm_catalogo)
		.add((mPuntero+44),		mRow.tdfarm_codprod)
		.add((mPuntero+57),		mDateFecha.format("yyyyMMdd"))
		.add((mPuntero+65),		('               ' + mRow.tdfarm_mntvntprod.replace(/\s/g, '-')).slice(-7))
		.add((mPuntero+72),		mIntPrdUnd)
		.add((mPuntero+73),		new Ax.lang.String(nf.format(mRow.tdfarm_mntunt_round, "0.00")).lpad(" ", 12))
		.add((mPuntero+85),		new Ax.lang.String(nf.format(mRow.tdfarm_cpgprd_round, "0.00")).lpad(" ", 12))
		.add((mPuntero+97),		new Ax.lang.String(nf.format(mRow.tdfarm_mntprd_round, "0.00")).lpad(" ", 12))
		.add((mPuntero+109),	new Ax.lang.String(nf.format(mRow.tdfarm_mntncub_round, "0.00")).lpad(" ", 12))
		.add((mPuntero+121),	mRow.tdfarm_diagprdfar)
		.add((mPuntero+126),	mStrPrdExoIgv)
		.add((mPuntero+127),	mRow.tdfarm_guiafarm + '~')
		mPuntero = mPuntero + 140
	});
	mRsDatos.close();

	// Armado del nombre llamando al JS nombreFichero
	let mStrNombre	= Ax.db.call('nombreFichero', pStrLote, 'dfar');
	let txt			= documento.toString().replaceAll('~', '\r\n')

	// Armado y devolucion del archivo dfarm.txt
	let tedef_dfarm = new Ax.sql.Blob(mStrNombre);
		tedef_dfarm.setContentType("text/plain");
		tedef_dfarm.setContent(txt, 'ISO-8859-1');
	return tedef_dfarm;
}

function generarFicheroDserv(pStrLote, pFacturas) {

	// Obtención de la cantidad de lineas
	let mIntCantidad = Ax.db.executeGet(`
		<select>
			<columns>
				count(*)
			</columns> 
			<from table = 'fas_tedef_dserv' />
			<where>
				tdserv_nrolote = ?
                AND tdserv_nrodocpg IN (${pFacturas})
			</where>
		</select>
	`, pStrLote);

	// Generación del total de caracteres a usar en el archivo txt
	let mIntTamanyo	= mIntCantidad * 230;

	// Declaracion de variables
	let nf			= new Ax.text.NumberFormat("us");
	let documento	= new Ax.text.Line(mIntTamanyo);
	let mPuntero	= 0;

	// Busqueda de los datos para DSERV
	let mRsDatos	= Ax.db.executeQuery(`
		<select>
			<columns>
				tdserv_serial,
				tdserv_nrolote,
				tdserv_ruc,
				tdserv_ipress,
				tdserv_tipodocpg,
				tdserv_nrodocpg,
				tdserv_pres,
				tdserv_corserv,
				tdserv_tipclasserv,
				tdserv_codclasproc,
				tdserv_grupo_cont,
				tdserv_descserv,
				tdserv_fecproc,
				tdserv_tipprofres,
				tdserv_nrocoleg,
				tdserv_tipdocprof,
				tdserv_nrodocprof,
				tdserv_nroserv,
				tdserv_mntuni,
				ROUND(tdserv_cpgvarproc, 2) tdserv_cpgvarproc,
				ROUND(tdserv_cpgfjproc, 2) tdserv_cpgfjproc,
				tdserv_mntprocserv,
				tdserv_mntnocubserv,
				tdserv_diagaso,
				tdserv_servexeimp,
				tdserv_codrubro,
				tdserv_liql_id,
				tdserv_mntuni_round,
				tdserv_cpgvr_round,
				tdserv_cpgfj_round,
				tdserv_igv_round,
				tdserv_mnttot_round
			</columns>
			<from table = 'fas_tedef_dserv' />
			<where>
				tdserv_nrolote = ?
                AND tdserv_nrodocpg IN (${pFacturas})
			</where>
			<order>
				tdserv_nrodocpg
			</order>
		</select>
	`, pStrLote).toMemory();

	/**
	 * Ajustes sobre las lineas: Redondeamos los copagos informados y ajustamos 
	 * la tabla de Atención (Date) de ser necesario, 
	 */
	mRsDatos.forEach((mRow) => {

		// Obtención de la clave asignada por el tipo de factura
		let mStrTipoDoc = Ax.db.executeGet(`
			<select>
				<columns>
					fvt_clave
				</columns>
				<from table = 'fas_factura_venta_tipo' />
				<where>
					fvt_codigo = ?
				</where>
			</select>
		`, mRow.tdserv_tipodocpg)

		// Si no existe el tipo, se asigna un 99
		if (!mStrTipoDoc) {
			mStrTipoDoc = '99'
		}

		/**
		 * Ajuste del dato informado según requerimiento de SUSALUD
		 * para que sea informado de manera correcta
		 */
		let mStrPrdExoIgv = '';
		switch (mRow.tdserv_servexeimp) {
			case "I"	: mStrPrdExoIgv = 'A'; break;
			case "E"	: mStrPrdExoIgv = 'D'; break;
			default		: mStrPrdExoIgv = 'A'; break;
		}

		// Quitando caracter "-" del número de factura
		let mStrFactu			= mRow.tdserv_nrodocpg.split('-');
		let mStrFactCompuesta	= mStrFactu[0] + '' + mStrFactu[1];
		let mDateFecha			= new Ax.util.Date(mRow.tdserv_fecproc);

		// Inicio del seteado de data en el archivo TXT
		documento
			.add(mPuntero,			('             ' + mRow.tdserv_ruc.replace(/\s/g, '-')).slice(-11))
			.add((mPuntero+11),		mRow.tdserv_ipress)
			.add((mPuntero+19),		mStrTipoDoc)
			.add((mPuntero+21),		mStrFactCompuesta)
			.add((mPuntero+33),		('             ' + mRow.tdserv_pres.replace(/\s/g, '-')).slice(-5))
			.add((mPuntero+38),		('             ' + mRow.tdserv_corserv.replace(/\s/g, '-')).slice(-4))
			.add((mPuntero+42),		mRow.tdserv_tipclasserv)
			.add((mPuntero+44),		mRow.tdserv_codclasproc)
			.add((mPuntero+54),		mRow.tdserv_descserv)
			.add((mPuntero+124),	mDateFecha.format("yyyyMMdd"))
			.add((mPuntero+132),	mRow.tdserv_tipprofres)
			.add((mPuntero+134),	mRow.tdserv_nrocoleg)
			.add((mPuntero+140),	mRow.tdserv_tipdocprof)
			.add((mPuntero+141),	mRow.tdserv_nrodocprof)
			.add((mPuntero+156),	mRow.tdserv_nroserv)
			.add((mPuntero+161),	new Ax.lang.String(nf.format(mRow.tdserv_mntuni_round, "0.00")).lpad(" ", 12))
			.add((mPuntero+173),	new Ax.lang.String(nf.format(mRow.tdserv_cpgvr_round, "0.00")).lpad(" ", 12))
			.add((mPuntero+185),	new Ax.lang.String(nf.format(mRow.tdserv_cpgfj_round, "0.00")).lpad(" ", 12))
			.add((mPuntero+197),	new Ax.lang.String(nf.format((mRow.tdserv_igv_round || 0), "0.00")).lpad(" ", 12))
			.add((mPuntero+209),	new Ax.lang.String(nf.format((mRow.tdserv_mnttot_round || 0), "0.00")).lpad(" ", 12))
			.add((mPuntero+221),	mRow.tdserv_diagaso)
			.add((mPuntero+226),	mStrPrdExoIgv)
			.add((mPuntero+227),	nf.format(mRow.tdserv_codrubro, "00") + "~")
		mPuntero = mPuntero + 230
	});
	mRsDatos.close();

	// Armado del nombre llamando al JS nombreFichero
	let mStrNombre	= Ax.db.call('nombreFichero', pStrLote, 'dser');
	let txt			= documento.toString().replaceAll('~', '\r\n')

	// Armado y devolucion del archivo dserv.txt
	let tedef_dserv = new Ax.sql.Blob(mStrNombre);
		tedef_dserv.setContentType("text/plain");
		tedef_dserv.setContent(txt, 'ISO-8859-1');
	return tedef_dserv;

}

function generarFicheroDate(pStrLote, pFacturas) {

	// Obtención de la cantidad de lineas
	let mIntCantidad = Ax.db.executeGet(`
		<select>
			<columns>
				count(*)
			</columns> 
			<from table = 'fas_tedef_date' />
			<where>
				tdate_nrolote = ?
                AND tdate_nrodocpg IN (${pFacturas})
			</where>
		</select>
	`, pStrLote);

	/**
	 * Generación del total de caracteres
	 * a usar en el archivo txt
	 */
	let mIntTamanyo	= mIntCantidad * 411;

	// Declaracion de variables
	let nf			= new Ax.text.NumberFormat("us");
	let documento	= new Ax.text.Line(mIntTamanyo);
	let mPuntero	= 0;

	// Busqueda de los datos para DATE
	let mRsDatos	= Ax.db.executeQuery(`
		<select>
			<columns>
				tdate_nrolote,
				tdate_ruc,
				tdate_ipress,
				tdate_tipodocpg,
				tdate_nrodocpg,
				tdate_pres,
				tdate_codint,
				tdate_tipoafi,
				tdate_codaseg,
				tdate_tipodoc,
				tdate_nrodoc,
				tdate_nrohstcli,
				tdate_docautpres,
				tdate_nrodocaut,
				tdate_segdocaut,
				tdate_segnrodoc,
				tdate_tipcob,
				tdate_subtipcob,
				tdate_prmdiag,
				tdate_segdiag,
				tdate_trcdiag,
				tdate_fecpres,
				tdate_horapres,
				tdate_tipprof,
				tdate_nrocoleg,
				tdate_tipdocmed,
				tdate_nrodocmed,
				tdate_rucref,
				tdate_fectrans,
				tdate_horatrans,
				tdate_tiphosp,
				tdate_fecinghosp,
				tdate_fecegrhosp,
				tdate_tipegrhosp,
				tdate_diasfactu,
				tdate_honoproexo,
				tdate_procdenexo,
				tdate_preshsctexo,
				tdate_exaauxexo,
				tdate_exaauximg,
				tdate_farmexo,
				tdate_protexo,
				tdate_prdsemedexo,
				tdate_pressalexo,
				tdate_cpgfijaf,
				tdate_cpgfijexo,
				tdate_cpgvaraf,
				tdate_cpgvarexo,
				tdate_totgstcub
			</columns>
			<from table = 'fas_tedef_date' />
			<where>
				tdate_nrolote = ?
                AND tdate_nrodocpg IN (${pFacturas})
			</where>
		</select>
	`, pStrLote);

	// Recorrido y llenado de los datos obtenidos en un archivo TXT
	mRsDatos.forEach((mRow) => {

		// Obtención del copagofijo y variable de productos y servicios
		let mObjCpFjVrServ = Ax.db.executeQuery(`
			<select>
				<columns>
					NVL(SUM(CASE WHEN tdserv_servexeimp  = 'IGV' THEN tdserv_cpgvr_round ELSE 0 END),0) tdserv_cpgvr_round_igv,
					NVL(SUM(CASE WHEN tdserv_servexeimp  = 'IGV' THEN tdserv_cpgfj_round ELSE 0 END),0) tdserv_cpgfj_round_igv,
					NVL(SUM(CASE WHEN tdserv_servexeimp != 'IGV' THEN tdserv_cpgvr_round ELSE 0 END),0) tdserv_cpgvr_round_exo,
					NVL(SUM(CASE WHEN tdserv_servexeimp != 'IGV' THEN tdserv_cpgfj_round ELSE 0 END),0) tdserv_cpgfj_round_exo
				</columns>
				<from table = 'fas_tedef_dserv' />
				<where>
						tdserv_nrodocpg	= ?
					AND tdserv_nrolote	= ?
					AND tdserv_pres		= ?
                    AND tdserv_nrodocpg IN (${pFacturas})
				</where>
			</select>
		`, mRow.tdate_nrodocpg, mRow.tdate_nrolote, mRow.tdate_pres).toOne();

		let mObjCpVrFarm = Ax.db.executeQuery(`
			<select>
				<columns>
					NVL(SUM(CASE WHEN tdfarm_prdexeifv  = 'IGV' THEN tdfarm_cpgprd_round ELSE 0 END),0) tdfarm_cpgprd_round_igv,
					NVL(SUM(CASE WHEN tdfarm_prdexeifv != 'IGV' THEN tdfarm_cpgprd_round ELSE 0 END),0) tdfarm_cpgprd_round_exo
				</columns>
				<from table = 'fas_tedef_dfarm' />
				<where>
						tdfarm_nrodocpg	= ?
					AND tdfarm_nrolote	= ?
					AND tdfarm_pres		= ?
                    AND tdfarm_nrodocpg IN (${pFacturas})
				</where>
			</select>
		`, mRow.tdate_nrodocpg, mRow.tdate_nrolote, mRow.tdate_pres).toOne();

		// Declaración de variables a usar para la data de los ficheros
		let mDateFec		= '';
		let mDateHor		= '';
		let mDateFecini		= '';
		let mDateFecegr		= '';
		let mDateFecha		= new Ax.util.Date(mRow.tdate_fecpres);
		let mDateHora		= new Ax.util.Date(mRow.tdate_horapres);
		let mStrHisCli		= mRow.tdate_nrohstcli;
		let mStrPrimDig		= mStrHisCli.substr(0, 2);
		let mStrhistoria;

		// Validación de la fecha de hospitalización y ajuste del formato obtenido
		if (mRow.tdate_fecinghosp != null) {
			mDateFecini	= new Ax.util.Date(mRow.tdate_fecinghosp).format("yyyyMMdd")
		}
		if (mRow.tdate_fecegrhosp != null) {
			mDateFecegr	= new Ax.util.Date(mRow.tdate_fecegrhosp).format("yyyyMMdd")
		}

		// Validación de la data para historia clínica
		if (mStrPrimDig == '00') {
			mStrhistoria	= mStrHisCli.substr(2,8);
		} else {
			mStrhistoria	= mStrHisCli.substr(1,8);
		}

		// Ajuste del formato de la fecha cuando hay translado
		if (mRow.tdate_fectrans != null) {
			mDateFec	= new Ax.util.Date(mRow.tdate_fectrans).format("yyyyMMdd");
			mDateHor	= new Ax.util.Date(mRow.tdate_horatrans).format("hhmmss");
		}

		// Obtención de la clave asignada por el tipo de factura
		let mStrTipoDoc = Ax.db.executeGet(`
			<select>
				<columns>
					fvt_clave
				</columns>
				<from table = 'fas_factura_venta_tipo' />
				<where>
					fvt_codigo = ?
				</where>
			</select>
		`, mRow.tdate_tipodocpg)

		// Si no existe el tipo, se asigna un 99
		if (!mStrTipoDoc) {
			mStrTipoDoc = '99'
		}

		// Quitando caracter "-" del número de factura
		let mStrFactura			= mRow.tdate_nrodocpg.split('-');
		let mStrFactCompuesta	= mStrFactura[0] + '' + mStrFactura[1];

		/**
		 * Asignación del monto calculado de los copagos fijos y variables
		 * en base a si es [0]inafecto o [1]afecto a IGV
		 */
		mRow.tdate_cpgfijexo	= mObjCpFjVrServ.tdserv_cpgfj_round_exo;
		mRow.tdate_cpgvarexo	= Ax.math.bc.add(mObjCpFjVrServ.tdserv_cpgvr_round_exo,mObjCpVrFarm.tdfarm_cpgprd_round_exo);
		// mRow.tdate_cpgfijaf		= mObjCpFjVrServ.tdserv_cpgfj_round_igv;
		// mRow.tdate_cpgvaraf		= Ax.math.bc.add(mObjCpFjVrServ.tdserv_cpgvr_round_igv,mObjCpVrFarm.tdfarm_cpgprd_round_igv);

		// Llenado del documento con los datos obtenidos
		documento
		.add((mPuntero),		('               ' + mRow.tdate_ruc.replace(/\s/g, '-')).slice(-11))
		.add((mPuntero+11),		mRow.tdate_ipress)
		.add((mPuntero+19),		mStrTipoDoc)
		.add((mPuntero+21),		mStrFactCompuesta)
		.add((mPuntero+33),		('               ' + mRow.tdate_pres.replace(/\s/g, '-')).slice(-5))
		.add((mPuntero+38),		mRow.tdate_codint)
		.add((mPuntero+48),		mRow.tdate_tipoafi)
		.add((mPuntero+49),		mRow.tdate_codaseg)
		.add((mPuntero+69),		mRow.tdate_tipodoc)
		.add((mPuntero+70),		mRow.tdate_nrodoc)
		.add((mPuntero+85),		mStrhistoria)
		.add((mPuntero+93),		mRow.tdate_docautpres)
		.add((mPuntero+95),		mRow.tdate_nrodocaut)
		.add((mPuntero+115),	mRow.tdate_segdocaut)
		.add((mPuntero+117),	mRow.tdate_segnrodoc)
		.add((mPuntero+137),	mRow.tdate_tipcob)
		.add((mPuntero+138),	mRow.tdate_subtipcob)
		.add((mPuntero+142),	mRow.tdate_prmdiag)
		.add((mPuntero+147),	mRow.tdate_segdiag)
		.add((mPuntero+152),	mRow.tdate_trcdiag)
		.add((mPuntero+157),	Ax.text.DateFormat.format(mDateFecha, "yyyyMMdd"))
		.add((mPuntero+165),	Ax.text.DateFormat.format(mDateHora, "hhmmss"))
		.add((mPuntero+171),	mRow.tdate_tipprof)
		.add((mPuntero+173),	mRow.tdate_nrocoleg)
		.add((mPuntero+179),	mRow.tdate_tipdocmed)
		.add((mPuntero+180),	mRow.tdate_nrodocmed)
		.add((mPuntero+195),	mRow.tdate_rucref)
		.add((mPuntero+206),	mDateFec)
		.add((mPuntero+214),	mDateHor)
		.add((mPuntero+220),	mRow.tdate_tiphosp)
		.add((mPuntero+221),	mDateFecini)
		.add((mPuntero+229),	mDateFecegr)
		.add((mPuntero+237),	mRow.tdate_tipegrhosp)
		.add((mPuntero+239),	mRow.tdate_diasfactu)
		.add((mPuntero+242),	new Ax.lang.String(nf.format(mRow.tdate_honoproexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+254),	new Ax.lang.String(nf.format(mRow.tdate_procdenexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+266),	new Ax.lang.String(nf.format(mRow.tdate_preshsctexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+278),	new Ax.lang.String(nf.format(mRow.tdate_exaauxexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+290),	new Ax.lang.String(nf.format(mRow.tdate_exaauximg, "0.00")).lpad(" ", 12))
		.add((mPuntero+302),	new Ax.lang.String(nf.format(mRow.tdate_farmexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+314),	new Ax.lang.String(nf.format(mRow.tdate_protexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+326),	new Ax.lang.String(nf.format(mRow.tdate_prdsemedexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+338),	new Ax.lang.String(nf.format(mRow.tdate_pressalexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+350),	new Ax.lang.String(nf.format(mRow.tdate_cpgfijaf, "0.00")).lpad(" ", 12))
		.add((mPuntero+362),	new Ax.lang.String(nf.format(mRow.tdate_cpgfijexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+374),	new Ax.lang.String(nf.format(mRow.tdate_cpgvaraf, "0.00")).lpad(" ", 12))
		.add((mPuntero+386),	new Ax.lang.String(nf.format(mRow.tdate_cpgvarexo, "0.00")).lpad(" ", 12))
		.add((mPuntero+398),	new Ax.lang.String(nf.format(mRow.tdate_totgstcub, "0.00")).lpad(" ", 12) + "~")
		mPuntero = mPuntero + 411
	});

	// Armado del nombre llamando al JS nombreFichero
	let mStrNombre	= Ax.db.call('nombreFichero', pStrLote, 'date');
	let txt			= documento.toString().replaceAll('~', '\r\n')

	// Armado y devolucion del archivo date.txt
	let tedef_date = new Ax.sql.Blob(mStrNombre);
		tedef_date.setContentType("text/plain");
		tedef_date.setContent(txt, 'ISO-8859-1');
	return tedef_date;
}

function generarFicheroDfac(pStrLote, pFacturas) {

	// Obtención de la cantidad de lineas
	let mIntCantidad = Ax.db.executeGet(`
		<select>
			<columns>
				count(*)
			</columns> 
			<from table = 'fas_tedef_dfac' />
			<where>
				tdfac_lote = ?
                AND tdfac_nrodocpg IN (${pFacturas})
			</where>
		</select>
	`, pStrLote)

	/**
	 * Generación del total de caracteres
	 * a usar en el archivo txt
	 */
	let mIntTamanyo = mIntCantidad * 243

	// Declaracion de variables
	let nf			= new Ax.text.NumberFormat("us");
	let documento	= new Ax.text.Line(mIntTamanyo);
	let mPuntero	= 0;

	// Busqueda de los datos para DFAC
	let mRsDatos	= Ax.db.executeQuery(`
		<select>
			<columns>
				tdfac_serial,
				tdfac_fecha,
				tdfac_hora,
				tdfac_lote,
				tdfac_iafas,
				tdfac_rucemp,
				tdfac_ipress,
				tdfac_tipodocpg,
				tdfac_nrodocpg,
				tdfac_fecfac,
				tdfac_prod,
				tdfac_cntpres,
				tdfac_mecpag,
				tdfac_submecpag,
				tdfac_mntprepac,
				tdfac_fecprepac,
				tdfac_tipmon,
				tdfac_mntexo,
				tdfac_totcofjaf,
				tdfac_totcofjex,
				tdfac_totcovaaf,
				tdfac_totcovaex,
				tdfac_baseimp,
				tdfac_montofact,
				tdfac_totfact,
				tdfac_tipnota,
				tdfac_nronota,
				tdfac_mntnota,
				tdfac_fecnota,
				tdfac_mtvnota,
				tdfac_fecenv,
				tdfac_indglob
			</columns> 
			<from table = 'fas_tedef_dfac' />
			<where>
				tdfac_lote = ?
                AND tdfac_nrodocpg IN (${pFacturas})
			</where>
		</select>
	`, pStrLote);

	// Recorrido y llenado de los datos obtenidos en un archivo TXT
	mRsDatos.forEach((mRow) => {

		// Verificador si hay productos y servicios con IGV - EXONERADO o ambos a la vez
		let mStrIgv = 0;
		let mStrExo = 0;
		let mRsIgvExoServ = Ax.db.executeQuery(`
			<select>
				<columns>
					DISTINCT
					tdserv_servexeimp
				</columns>
				<from table = 'fas_tedef_dserv' />
				<where>
						tdserv_nrodocpg	= ?
					AND tdserv_nrolote	= ?
                    AND tdserv_nrodocpg IN (${pFacturas})
				</where>
			</select>
		`, mRow.tdfac_nrodocpg, mRow.tdfac_lote);

		let mRsIgvExoFarm = Ax.db.executeQuery(`
			<select>
				<columns>
					DISTINCT
					tdfarm_prdexeifv
				</columns>
				<from table = 'fas_tedef_dfarm' />
				<where>
						tdfarm_nrodocpg	= ?
					AND tdfarm_nrolote	= ?
                    AND tdfarm_nrodocpg IN (${pFacturas})
				</where>
			</select>
		`, mRow.tdfac_nrodocpg, mRow.tdfac_lote);

		mRsIgvExoServ.forEach((mRow) => {
			switch (mRow.tdserv_servexeimp) {
				case 'IGV' :
					mStrIgv = 1;
					break;

				case 'EXONERADO' :
					mStrExo = 1;
					break;
			}
		});
		mRsIgvExoServ.close();

		mRsIgvExoFarm.forEach((mRow) => {
			switch (mRow.tdfarm_prdexeifv) {
				case 'IGV' :
					mStrIgv = 1;
					break;

				case 'EXONERADO' :
					mStrExo = 1;
					break;
			}
		});
		mRsIgvExoFarm.close();

		// Obtención de la suma total de gastos
		let mObjTotGastosAte = Ax.db.executeQuery(`
			<select>
				<columns>
					SUM(tdate_totgstcub) tdate_totgstcub,
					SUM(tdate_cpgfijaf)  tdate_cpgfijaf,
					SUM(tdate_cpgfijexo) tdate_cpgfijexo,
					SUM(tdate_cpgvaraf)  tdate_cpgvaraf,
					SUM(tdate_cpgvarexo) tdate_cpgvarexo
				</columns>
				<from table = 'fas_tedef_date' />
				<where>
						tdate_nrodocpg	= ?
					AND tdate_nrolote	= ?
                    AND tdate_nrodocpg IN (${pFacturas})
				</where>
			</select>
		`, mRow.tdfac_nrodocpg, mRow.tdfac_lote).toOne();

		// Quitando caracter "-" del número de factura
		let mStrFactura			= mRow.tdfac_nrodocpg.split('-');
		let mStrFactCompuesta	= mStrFactura[0] + '' + mStrFactura[1];
		let mDateFecha			= new Ax.util.Date(mRow.tdfac_fecha);
		let mDateHora			= new Ax.util.Date(mRow.tdfac_hora);

		// Obtención de la clave asignada por el tipo de factura
		let mStrTipoDoc = Ax.db.executeGet(`
			<select>
				<columns>
					fvt_clave
				</columns>
				<from table = 'fas_factura_venta_tipo' />
				<where>
					fvt_codigo = ?
				</where>
			</select>
		`, mRow.tdfac_tipodocpg)

		// Si no existe el tipo, se asigna un 99
		if (!mStrTipoDoc) {
			mStrTipoDoc = '99'
		}

		// Si el codigo del producto no esta informado, se coloca por defecto "99999"
		if (mRow.tdfac_prod == "null") {
			cod_producto = '99999'
		} else {
			cod_producto = mRow.tdfac_prod
		}

		// Conversión del mecanismo de pago al dato correspondiente
		let	mStrMecPago = '';
		switch (mRow.tdfac_mecpag) {
			case "PPS"		: mStrMecPago = '01'; break;
			case "PACMES"	: mStrMecPago = '02'; break;
			case "PAQUI"	: mStrMecPago = '03'; break;
			default			: mStrMecPago = '99'; break;
		}

		// Si el submecanismo de pago es nulo, se informa por defecto "999"
		if (mRow.tdfac_submecpag == null) {
			mRow.tdfac_submecpag = '999'
		}

		/**
		 * Si el mecanismo de pago paciente mes o paquete quirúrgico, se informa
		 * el monto prepactado
		 */
		let mBcMontoPrePactado = null;
		if (mStrMecPago == '02' || mStrMecPago == '03') {
			mBcMontoPrePactado = mRow.tdfac_mntprepac;
		} else {
			mBcMontoPrePactado = 0.00;
		}

		// Si el mecanismo de pago paciente mes se informa la fecha de inicio
		let mDatePrePactado = '';
		if (mStrMecPago == '02') {
			mDatePrePactado = mRow.tdfac_fecprepac;
		}else{
			mDatePrePactado = '';
		}

		// Equivalencia del tipo de moneda [P]en = 1 - [U]SD = 2
		let mIntDivisa
		switch (mRow.tdfac_tipmon) {
			case "P"	: mIntDivisa = '1'; break;
			case "U"	: mIntDivisa = '2'; break;
		}

		// Variables para los montos, copagos e IGV
		let mBcMontoExo		= mRow.tdfac_mntexo;
		let mBcCpFj			= mObjTotGastosAte.tdate_cpgfijaf;
		let mBcCpFjExo		= mObjTotGastosAte.tdate_cpgfijexo;
		let mBcCpVar		= mObjTotGastosAte.tdate_cpgvaraf;
		let mBcCpVarExo		= mObjTotGastosAte.tdate_cpgvarexo;

		// Equivalencia de la nota de crédito informada
		let mStrTipoNc = '';
		switch (mRow.tdfac_tipnota) {
			case "NCRE"	: mStrTipoNc = 'C'; break;
			case "NDEB"	: mStrTipoNc = 'D'; break;
			default		: mStrTipoNc = 'N';
		}

		/**
		 * Obtenemos los copagos para calcular el monto imponible
		 *	- Monto imponible = GastoTotal - (Copago Fijo + Copago Variable) - Gastos Exonerados
		 *
		 * Si es un monto prepactado el calculo será en base a dicho monto
		 *	- Monto imponible = MontoPrePactado - (Copago Fijo + Copago Variable)
		 */
		let mBcSumCpVrFjIgv	= Ax.math.bc.add(mBcCpFj, mBcCpVar);
		let mBcSumCpVrFjExo	= Ax.math.bc.add(mBcCpFjExo, mBcCpVarExo);
		let mBcMntImponible	= 0.00;
		let mBcIgv			= 0.00;

		if (mBcMontoPrePactado == 0.00) {
			if (mStrIgv == 0 && mStrExo == 1) {
				mBcMntImponible	= Ax.math.bc.sub(mObjTotGastosAte.tdate_totgstcub, mBcMontoExo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
			} else {
				mBcMntImponible	= Ax.math.bc.sub(mObjTotGastosAte.tdate_totgstcub, mBcSumCpVrFjIgv).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
			}
		} else {
			mBcMntImponible	= Ax.math.bc.sub(mBcMontoPrePactado, mBcSumCpVrFjIgv).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
		}

		// Si no es exonerado, calculamos el IGV al 18% redondeado a dos cifras
		if (mBcMontoExo == 0.00 || (mStrIgv == 1 && mStrExo == 1)) {
			mBcIgv	= Ax.math.bc.mul(mBcMntImponible, 0.18).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);
		}

		/**
		 * Calculamos el Monto Final con el IGV
		 * 
		 * PPS [01] 				: Monto Final = MontoImponible + IGV + MontosExonerados - (Copago Fijo Exonerado + copago Variable Exonerado)
		 * PACMES - PAQUI [02,03]	: Monto Final = MontoImponible + IGV - (Copago Fijo Exonerado + copago Variable Exonerado)
		 */
		if (mStrMecPago == '01') {
			mBcMontoFinal = Ax.math.bc.sub(Ax.math.bc.add(mBcMntImponible, mBcIgv, mBcMontoExo), mBcSumCpVrFjExo);
		} else {
			mBcMontoFinal = Ax.math.bc.sub(Ax.math.bc.add(mBcMntImponible, mBcIgv), mBcSumCpVrFjExo);
		}

		// Si es exonerado, el monto imponible es 0
		if (mBcMntImponible < 0.00) {
			mBcMntImponible = 0.00;
		}

		// Inicio del seteado de data en el archivo TXT
		documento
			.add((mPuntero),		mDateFecha.format('yyyyMMdd'))
			.add((mPuntero+8),		mDateHora.format('HHmmss'))
			.add((mPuntero+14),		nf.format(mRow.tdfac_lote, "0000000"))
			.add((mPuntero+21),		nf.format(mRow.tdfac_iafas, "00000"))
			.add((mPuntero+26),		mRow.tdfac_rucemp)
			.add((mPuntero+37),		mRow.tdfac_ipress)
			.add((mPuntero+45),		mStrTipoDoc)
			.add((mPuntero+47),		mStrFactCompuesta)
			.add((mPuntero+59),		Ax.text.DateFormat.format(mRow.tdfac_fecfac, "yyyyMMdd"))
			.add((mPuntero+67),		('               ' + cod_producto.replace(/\s/g, '-')).slice(-5))
			.add((mPuntero+72),		nf.format(mRow.tdfac_cntpres, "00000"))
			.add((mPuntero+77),		mStrMecPago)
			.add((mPuntero+79),		mRow.tdfac_submecpag)
			.add((mPuntero+82),		new Ax.lang.String(nf.format(mBcMontoPrePactado, "0.00")).lpad(" ", 12))
			.add((mPuntero+94),		mDatePrePactado ? Ax.text.DateFormat.format(mDatePrePactado, "yyyyMMdd") : '')
			.add((mPuntero+102),	mIntDivisa)
			.add((mPuntero+103),	new Ax.lang.String(nf.format(mBcMontoExo, "0.00")).lpad(" ", 12))
			.add((mPuntero+115),	new Ax.lang.String(nf.format(mBcCpFj, "0.00")).lpad(" ", 12))
			.add((mPuntero+127),	new Ax.lang.String(nf.format(mBcCpFjExo, "0.00")).lpad(" ", 12))
			.add((mPuntero+139),	new Ax.lang.String(nf.format(mBcCpVar, "0.00")).lpad(" ", 12))
			.add((mPuntero+151),	new Ax.lang.String(nf.format(mBcCpVarExo, "0.00")).lpad(" ", 12))

			.add((mPuntero+163),	new Ax.lang.String(nf.format(mRow.tdfac_baseimp, "0.00")).lpad(" ", 12))
			.add((mPuntero+175),	new Ax.lang.String(nf.format(mRow.tdfac_montofact, "0.00")).lpad(" ", 12))
			.add((mPuntero+187),	new Ax.lang.String(nf.format(mRow.tdfac_totfact, "0.00")).lpad(" ", 12))

			// .add((mPuntero+163),	new Ax.lang.String(nf.format(mBcMntImponible, "0.00")).lpad(" ", 12))
			// .add((mPuntero+175),	new Ax.lang.String(nf.format(mBcIgv, "0.00")).lpad(" ", 12))
			// .add((mPuntero+187),	new Ax.lang.String(nf.format(mBcMontoFinal, "0.00")).lpad(" ", 12))

			.add((mPuntero+199),	mStrTipoNc)
			.add((mPuntero+200),	mRow.tdfac_nronota ? mRow.tdfac_nronota : '')
			.add((mPuntero+212),	mRow.tdfac_mntnota ? new Ax.lang.String(nf.format(mRow.tdfac_mntnota, "0.00")).lpad(" ", 12) : '')
			.add((mPuntero+224),	mRow.tdfac_fecnota ? Ax.text.DateFormat.format(mRow.tdfac_fecnota, "yyyyMMdd") : '')
			.add((mPuntero+232),	mRow.tdfac_mtvnota ? mRow.tdfac_mtvnota : '')
			.add((mPuntero+233),	mRow.tdfac_fecenv ? Ax.text.DateFormat.format(mRow.tdfac_fecenv, "yyyyMMdd") : '')
			.add((mPuntero+241),	mRow.tdfac_indglob + "~")
			.toString();
		mPuntero = mPuntero + 243;
	});

	// Armado del nombre llamando al JS nombreFichero
	let mStrNombre = Ax.db.call('nombreFichero', pStrLote, 'dfac');
	let txt = documento.toString().replaceAll('~', '\r\n')

	// Armado y devolucion del archivo dfac.txt
	let tedef_dfac = new Ax.sql.Blob(mStrNombre);
		tedef_dfac.setContentType("text/plain");
		tedef_dfac.setContent(txt, 'ISO-8859-1');
	return tedef_dfac;
}

let mArrFichero = []
let tdl_nrolote = '0622931';
let facturas = `'F418-00046031',
'F418-00046032',
'F418-00046033',
'F418-00046034',
'F418-00046035',
'F418-00046036',
'F418-00046037',
'F418-00046039',
'F418-00046040',
'F418-00046042',
'F418-00046043',
'F418-00046044',
'F418-00046046',
'F418-00046047',
'F418-00046048',
'F418-00046049',
'F418-00046050',
'F418-00046051',
'F418-00046052',
'F418-00046053',
'F418-00046054',
'F418-00046055',
'F418-00046056',
'F418-00046057',
'F418-00046059',
'F418-00046060',
'F418-00046061',
'F418-00046062',
'F418-00046063',
'F418-00046064',
'F418-00046065',
'F418-00046066',
'F418-00046067',
'F418-00046068',
'F418-00046069',
'F418-00046070',
'F418-00046071',
'F418-00046072',
'F418-00046073',
'F418-00046074',
'F418-00046075',
'F418-00046076',
'F418-00046078',
'F418-00046079',
'F418-00046080',
'F418-00046083',
'F418-00046084',
'F418-00046085',
'F418-00046086',
'F418-00046087'`;
mArrFichero.push(Ax.db.call('generarFicheroDden',tdl_nrolote));
mArrFichero.push(generarFicheroDfarm(tdl_nrolote, facturas));
mArrFichero.push(generarFicheroDserv(tdl_nrolote, facturas));
mArrFichero.push(generarFicheroDate(tdl_nrolote, facturas));
mArrFichero.push(generarFicheroDfac(tdl_nrolote, facturas));

let zip = new Ax.util.zip.Zip(new Ax.io.File("/home/axional/studio_next/tmp/tedef.zip"));
	mArrFichero.forEach((row) => {
		zip.zipFile(row);
	})
zip.close();
let blob = new Ax.sql.Blob(new Ax.io.File("/home/axional/studio_next/tmp/tedef.zip"));
return blob;