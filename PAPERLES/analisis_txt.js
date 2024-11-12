function pe_einvoice_generateDoctxt_IFAS(pObjHeadInvoice, pArrLineInvoice, pArrTaxInvoice) {

    //==========================================================================
    // Se valida que el documento se encuentre contabilizado
    //==========================================================================
    if(!pObjHeadInvoice.esta_contabilizado) {
        throw new Ax.ext.Exception(`
            El documento [${pObjHeadInvoice.serie_correlativo}] debe estar 
            contabilizado para ser enviado a Paperless.
        `);
    }
    
    //==========================================================================
    // Correo electrónico del cliente según la base de datos
    //==========================================================================
    var mStrEmailReceptor = '';
    
    if(pObjHeadInvoice.db_name == 'ghq_crp_pro') {
        
        mStrEmailReceptor = pObjHeadInvoice.correo_tercero;
        
        //======================================================================
        // [07-03-2024 CRP] FRAY FLORES, JOSÉ LUIS: 
        // Se quita la validación para el correo electrónico del tercero
        //======================================================================
        /*if(mStrEmailReceptor == null) {
            throw new Ax.ext.Exception(`
                Correo electrónico no está informado para tercero 
                [${pObjHeadInvoice.codigo_tercero}] en la tabla de Contactos
                [ccontact].
            `);
        }*/
        
    } else {
        mStrEmailReceptor = 'nicole.rosario@deister.pe; sheyla.rojas@deister.pe';
    }
    
    // =========================================================================
    // LOCAL FUNCTION: __roundNumber
    //
    // Redondea a dos decimales el valor que recibe como parámetro
    // =========================================================================
    function __roundNumber(pIntNumber){
        var mBcNumberRound       = Ax.math.bc.scale(pIntNumber, 2, Ax.math.bc.RoundingMode.HALF_UP);
        var NumberFormatUs       = new Ax.text.NumberFormat("us");
        var mBcNumberRoundFormat = NumberFormatUs.format(mBcNumberRound, "0000000000.00");
        var mBcNumberRoundFinal  = parseFloat(mBcNumberRoundFormat);
        return mBcNumberRoundFinal;
    }    
    
    // =========================================================================
    // LOCAL FUNCTION: __setObjectTaxType
    //
    // Identifica valores según el tipo de impuesto informado en Axional
    // =========================================================================
    function __setObjectTaxType(pStrTaxType){
        
        var mObjTaxType = {};
        
        if(pStrTaxType == 'IGVG' || pStrTaxType == 'IGVH' || pStrTaxType == 'IGVS') {
            mObjTaxType.tipo_impuesto   = 'S';
            mObjTaxType.cod_afecta_igv  = 10;
            mObjTaxType.id_tributo      = 1000;
            mObjTaxType.nom_tributo     = 'IGV';
            mObjTaxType.nom_int_tributo = 'VAT';
        } else if(pStrTaxType == 'IGVR') {
            mObjTaxType.tipo_impuesto   = 'Z';
            mObjTaxType.cod_afecta_igv  = 21;
            mObjTaxType.id_tributo      = 9996;
            mObjTaxType.nom_tributo     = 'GRA';
            mObjTaxType.nom_int_tributo = 'FRE';
        }else if(pStrTaxType == 'IGVE' || pStrTaxType == 'IGVX') {
            mObjTaxType.tipo_impuesto   = 'E';
            mObjTaxType.cod_afecta_igv  = 20;
            mObjTaxType.id_tributo      = 9997;
            mObjTaxType.nom_tributo     = 'EXO';
            mObjTaxType.nom_int_tributo = 'VAT';
        } else if(pStrTaxType == 'IGVI') {
            mObjTaxType.tipo_impuesto   = 'O';
            mObjTaxType.cod_afecta_igv  = 30;
            mObjTaxType.id_tributo      = 9998;
            mObjTaxType.nom_tributo     = 'INA';
            mObjTaxType.nom_int_tributo = 'FRE';
        }  else if(pStrTaxType == 'OTR') {
            mObjTaxType.tipo_impuesto   = 'S';
            mObjTaxType.cod_afecta_igv  = '';
            mObjTaxType.id_tributo      = 9999;
            mObjTaxType.nom_tributo     = 'OTR';
            mObjTaxType.nom_int_tributo = 'OTH';
        } else if(pStrTaxType == 'ISCF' || pStrTaxType == 'ISCP' || pStrTaxType == 'ISCV') {
            mObjTaxType.tipo_impuesto   = 'S';
            mObjTaxType.cod_afecta_igv  = '';
            mObjTaxType.id_tributo      = 2000;
            mObjTaxType.nom_tributo     = 'ISC';
            mObjTaxType.nom_int_tributo = 'EXC';
        } else {
            throw new Ax.ext.Exception(`
                Mapeo no realizado para el tipo de impuesto Axional: 
                [${pStrTaxType}] con el catálogo 05 de SUNAT.`
            );
        }
            
        return mObjTaxType;
    }    
    
    //==========================================================================
    // Objeto Trama EN (Encabezado) donde se almacenarán los campos requeridos 
    // para EN de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mObjTramaEN = {};
    
    //==========================================================================
    // Objeto Trama ENEX (Encabezado Extensión) donde se almacenarán los campos 
    // requeridos para ENEX de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mObjTramaENEX = {};
    
    //==========================================================================
    // Objeto Trama DN (Notas del Documento) donde se almacenarán los campos 
    // requeridos para DN de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mObjTramaDN = {};
    
    //==========================================================================
    // Arreglo Trama ITEMS (Agrupador de los objetos DE - DEDI - DEIM por cada 
    // ITEM, es decir cada línea del documento [gvenfacl])
    // mObjTramaDE - Objeto Trama DE (Detalle item)
    // mObjTramaDEDI - Objeto Trama DEDI (Descripción del Item)
    // mObjTramaDEIM - Objeto Trama DEIM (Impuestos del Item)
    //==========================================================================
    var mArrTramaITEMS = [];
    
    //==========================================================================
    // Arreglo Trama DI (Impuestos Globales) donde se almacenarán los campos 
    // requeridos para DI de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mArrTramaDI = [];
    
    //==========================================================================
    // Objeto Trama RE (requerida para NC / ND / referenciar otros documentos) 
    // donde se almacenarán los campos para RE de la trama y una etiqueta 
    // referencial de cada campo (gvenfacd.dockey = '07')
    //==========================================================================
    var mObjTramaRE = {};
    
    //==========================================================================
    // Objeto Trama FP (Forma Pago) donde se almacenarán los campos 
    // requeridos para FP de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mObjTramaFP = {};
    
    //==========================================================================
    // Objeto Trama DET (Detracción) donde se almacenarán los campos 
    // requeridos para DET de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mObjTramaDET = {};
    
    //==========================================================================
    // Objeto Trama PE (Personalizadas) donde se almacenarán los campos 
    // requeridos para PE de la trama y una etiqueta referencial de cada campo
    //==========================================================================
    var mObjTramaPE = {};

    //==========================================================================
    // Identificación de los campos para mObjTramaEN
    //==========================================================================
    mObjTramaEN.tipo_documento       = pObjHeadInvoice.tipo_documento;
    mObjTramaEN.serie_correlativo    = pObjHeadInvoice.serie_correlativo;
    mObjTramaEN.tipo_nota            = (pObjHeadInvoice.tipo_documento == '07') ? pObjHeadInvoice.tipo_nota : '';
    mObjTramaEN.documento_referencia = (pObjHeadInvoice.tipo_documento == '07') ? pObjHeadInvoice.documento_referencia : '';
    mObjTramaEN.sustento             = (pObjHeadInvoice.tipo_documento == '07') ? pObjHeadInvoice.tipo_nota_sustento   : '';
    mObjTramaEN.fecha_emision        = pObjHeadInvoice.fecha_emision;
    mObjTramaEN.tipo_moneda          = pObjHeadInvoice.tipo_moneda;
    mObjTramaEN.ruc_emisor           = pObjHeadInvoice.ruc_emisor;
    mObjTramaEN.tip_id_emisor        = pObjHeadInvoice.tip_id_emisor;
    mObjTramaEN.nom_com_emisor       = pObjHeadInvoice.nom_com_emisor;
    mObjTramaEN.razon_social         = pObjHeadInvoice.razon_social_emisor;
    mObjTramaEN.codigo_ubigeo        = '150131';
    mObjTramaEN.direccion_emisor     = pObjHeadInvoice.direccion_emisor;
    mObjTramaEN.departamento_emisor  = pObjHeadInvoice.departamento_emisor;
    mObjTramaEN.provincia_emisor     = pObjHeadInvoice.provincia_emisor;
    mObjTramaEN.distrito_emisor      = pObjHeadInvoice.distrito_emisor;
    mObjTramaEN.num_id_adquiriente   = (pObjHeadInvoice.zona_tercero == 'INT') ? '00000000000' : pObjHeadInvoice.num_id_adquiriente;
    mObjTramaEN.tipo_id_adquiriente  = (pObjHeadInvoice.zona_tercero == 'INT') ? '0' : pObjHeadInvoice.tipo_id_adquiriente;
    mObjTramaEN.full_nom_adquiriente = pObjHeadInvoice.full_nom_adquiriente;
    mObjTramaEN.direccion_receptor   = (pObjHeadInvoice.direccion_receptor !== null ) ? pObjHeadInvoice.direccion_receptor : '---------';
    mObjTramaEN.valor_total_venta    = pObjHeadInvoice.valor_total;
    mObjTramaEN.total_impuestos      = pObjHeadInvoice.total_impuestos;    
    mObjTramaEN.monto_descuentos     = __roundNumber(pObjHeadInvoice.monto_descuentos);
    mObjTramaEN.monto_recargos       = '';
    mObjTramaEN.importe_total        = pObjHeadInvoice.importe_total;
    mObjTramaEN.cod_otros_tributos   = '';
    mObjTramaEN.valor_neto_venta     = pObjHeadInvoice.importe_total;
    mObjTramaEN.num_doc_comprador    = pObjHeadInvoice.num_id_adquiriente;
    mObjTramaEN.tip_doc_comprador    = pObjHeadInvoice.tip_id_emisor;
    mObjTramaEN.cod_pais_emisor      = pObjHeadInvoice.cod_pais_emisor;
    mObjTramaEN.urbanizacion_emisor  = '';
    
    //==========================================================================
    // Identificación de los campos para mObjTramaENEX
    //==========================================================================
    mObjTramaENEX.version_ubl        = 2.1;
    mObjTramaENEX.tipo_operacion     = (pObjHeadInvoice.existe_detraccion) ? '1001' : (pObjHeadInvoice.zona_tercero == 'INT') ? '0401' : '0101';
    mObjTramaENEX.orden_compra       = '';
    mObjTramaENEX.redondeo           = '';
    mObjTramaENEX.total_anticipos    = '';
    mObjTramaENEX.hora_emision       = '';
    mObjTramaENEX.fecha_vencimiento  = pObjHeadInvoice.fecha_vencimiento;
    mObjTramaENEX.codigo_sunat       = '0000';
    mObjTramaENEX.importe_total      = pObjHeadInvoice.importe_total;
    mObjTramaENEX.num_doc_asociados  = '';
    mObjTramaENEX.tip_doc_asociados  = '';
    mObjTramaENEX.full_nom_asociados = '';
    
    //==========================================================================
    // Identificación de los campos para mObjTramaDN 
    //==========================================================================
    var mStrDivisa = '';
    
    if (mObjTramaEN.tipo_moneda == 'PEN') mStrDivisa = 'SOLES';
    
    if (mObjTramaEN.tipo_moneda == 'USD') mStrDivisa = 'DÓLARES';

    var NumberFormatUs       = new Ax.text.NumberFormat("us");
    var mStrImpTotFormat     = NumberFormatUs.format(parseFloat(mObjTramaEN.importe_total), "0000000000.00");
    var mFloatParteEnteraAux = parseFloat(mStrImpTotFormat.split('.')[0]);
    var mStrParteDecimalAux  = mStrImpTotFormat.split('.')[1];
    var mStrMontoTotal       = Ax.db.executeFunction("icon_n2str_es", mFloatParteEnteraAux).toValue() + ` CON ${mStrParteDecimalAux}/100 ${mStrDivisa}`;

    mObjTramaDN.num_linea_nota = '1';
    mObjTramaDN.codigo_leyenda = '1000';
    mObjTramaDN.glosa_leyenda  = mStrMontoTotal;
    
    if (pObjHeadInvoice.existe_detraccion) {
        mObjTramaDN.num_linea_det      = '2';
        mObjTramaDN.codigo_leyenda_det = '2006';
        mObjTramaDN.glosa_leyenda_det  = 'Operación sujeta a detracción';
    }
    
    //==========================================================================
    // Correlativo para enumerar las líneas del detalle del comprobante
    //========================================================================== 
    var mIntCorrelativo = 0;
    
    //==========================================================================
    // Ajuste para integrar la línea de deducible a las otras mediante un
    // promedio ponderado
    //========================================================================== 
    let pNewArrLineInvoice = [];
    let mPreTot = 0;
    let mDedTot = 0;
    
    //==========================================================================
    // Ajuste para integrar coaseguros inafectos paciente mes sobre una sola
    // línea afecta
    //==========================================================================
    let mCpmDif = 0;
    
    pArrLineInvoice.forEach(row=>{
        if (row.codigo_item != 'DC') {
            if (row.codigo_item == '286' && row.cantidad_item < 0) {
                mCpmDif += row.precio_unitario;
                mPreTot -= row.precio_unitario;
            } else {
                mPreTot += row.precio_unitario;
            }
        } else {
            mDedTot= row.precio_unitario;
        }
    })

    pArrLineInvoice.forEach(row=>{
        if (row.codigo_item != 'DC' &&
           !(row.codigo_item == '286' && row.cantidad_item < 0)) {

            if (row.codigo_item == '286' && row.cantidad_item > 0 && mCpmDif > 0) {
                row.precio_unitario = Ax.math.bc.sub(row.precio_unitario,mCpmDif)
                mCpmDif = 0;
            }

            row.precio_unitario = Ax.math.bc.sub(row.precio_unitario,Ax.math.bc.mul(mDedTot,Ax.math.bc.div(row.precio_unitario,mPreTot)))

            if (row.precio_unitario.compareTo(Ax.math.bc.of(0)) == 1) {
                pNewArrLineInvoice.push(row)
            }
        }
    })
    
     if(pObjHeadInvoice.comparar_monto_total == 0){
        
        mDedTot = Ax.db.executeGet(`<select>
			<columns>
				cvenfacl.precio  precio_unitario
				
			</columns>
			<from table = 'cvenfacl'>
				<join table = 'carticul'>
					<on>cvenfacl.codart = carticul.codart</on>
					<join type = 'left' table = 'crp_unimed'>
						<on>carticul.unimed = crp_unimed.codigo</on>
					</join>
				</join>
				<join table = 'ctax_type'>
					<on>cvenfacl.tax_code1 = ctax_type.type_code</on>
				</join>
			</from> 
			<where>
				cvenfacl.facidx = ?
                AND cvenfacl.codart  IN ('DC')
			</where>
		</select>`,pObjHeadInvoice.id_factura);
    }
    
    pArrLineInvoice = pNewArrLineInvoice;
    
    //==========================================================================
    // pArrLineInvoice Array Comprobante Líneas para obtener los campos 
    // necesarios de cada línea del documento para generar la trama
    //==========================================================================    
    for (var mRowLineInvoice of pArrLineInvoice) {
        
        mIntCorrelativo++;
        
        var mBcPorcenDtoLinea   = __roundNumber(Ax.math.bc.sub(100, Ax.math.bc.mul(Ax.math.bc.sub(100, pObjHeadInvoice.monto_descuentos), Ax.math.bc.sub(100, mRowLineInvoice.porcen_dto_axional), 0.01)));
        var mBcImporteNetoLinea = 0;
        var mBcMontoDtoLinea    = 0;
        var mBcImpuestoLinea    = 0;
    
        if (mRowLineInvoice.cantidad_item >= 0) {
            mBcImporteNetoLinea = __roundNumber(Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario));
            mBcMontoDtoLinea    = __roundNumber(Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario, mBcPorcenDtoLinea, 0.01));
            mBcImpuestoLinea    = __roundNumber(Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario, mRowLineInvoice.tasa_impuesto, Ax.math.bc.sub(1, Ax.math.bc.mul(mBcPorcenDtoLinea, 0.01)), 0.01));
        } else if(mRowLineInvoice.codigo_item == 'DC'){
            mBcImporteNetoLinea = __roundNumber(Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario));
            mBcMontoDtoLinea    = __roundNumber(Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario, mBcPorcenDtoLinea, 0.01));
            mBcImpuestoLinea    = __roundNumber(Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario, mRowLineInvoice.tasa_impuesto, Ax.math.bc.sub(1, Ax.math.bc.mul(mBcPorcenDtoLinea, 0.01)), 0.01));
            mRowLineInvoice.cantidad_item  = (-1)*mRowLineInvoice.cantidad_item;
        } else {
            mBcImporteNetoLinea = __roundNumber((-1)*Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario));
            mBcMontoDtoLinea    = __roundNumber((-1)*Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario, mBcPorcenDtoLinea, 0.01));
            mBcImpuestoLinea    = __roundNumber((-1)*Ax.math.bc.mul(mRowLineInvoice.cantidad_item, mRowLineInvoice.precio_unitario, mRowLineInvoice.tasa_impuesto, Ax.math.bc.sub(1, Ax.math.bc.mul(mBcPorcenDtoLinea, 0.01)), 0.01));
            mRowLineInvoice.cantidad_item  = (-1)*mRowLineInvoice.cantidad_item;
        }
        
        var mObjTaxType = __setObjectTaxType(mRowLineInvoice.codigo_impuesto);
        
        //======================================================================
        // Identificación de los campos para mObjTramaDE
        //======================================================================
        var mObjTramaDE = {};
        mObjTramaDE.item_correlativo  = mIntCorrelativo;
        mObjTramaDE.precio_ven_uni    = __roundNumber(Ax.math.bc.div(Ax.math.bc.add(Ax.math.bc.sub(mBcImporteNetoLinea, mBcMontoDtoLinea), mBcImpuestoLinea), mRowLineInvoice.cantidad_item));
        mObjTramaDE.unidad_medida     = mRowLineInvoice.unidad_medida;
        mObjTramaDE.cantidad_item     = mRowLineInvoice.cantidad_item;
        mObjTramaDE.valor_venta       = Ax.math.bc.sub(mBcImporteNetoLinea, mBcMontoDtoLinea);
        mObjTramaDE.valor_venta_item  = __roundNumber(mRowLineInvoice.precio_unitario);
        mObjTramaDE.codigo_item       = mRowLineInvoice.codigo_item;
        mObjTramaDE.tipo_precio_venta = '01';
        mObjTramaDE.nro_lote          = '';
        mObjTramaDE.marca             = '';
        mObjTramaDE.pais_origen       = '';
        
        //======================================================================
        // Identificación de los campos para mObjTramaFacturaDEDI
        //======================================================================
        var mObjTramaDEDI = {};
        mObjTramaDEDI.descripcion_item   = mRowLineInvoice.descripcion_item;
        if (pObjHeadInvoice.modo_pago == 'P'){
            mObjTramaDEDI.descripcion_item   = mRowLineInvoice.descripcion_item+ ' PERIODO: '+ pObjHeadInvoice.periodo_fac;
        }
        mObjTramaDEDI.nota_adicional     = '';    
        mObjTramaDEDI.nom_concepto       = '';    
        mObjTramaDEDI.cod_concepto       = '';    
        mObjTramaDEDI.num_placa_vehiculo = '';    
        mObjTramaDEDI.cod_producto_sunat = mRowLineInvoice.codigo_prod_sunat == null ? '85101500' : mRowLineInvoice.codigo_prod_sunat;
        mObjTramaDEDI.cod_producto_gs1   = '';    
        mObjTramaDEDI.tip_estruc_gtin    = '';
        mObjTramaDEDI.porcen_dto_linea   = mBcPorcenDtoLinea;
        mObjTramaDEDI.dscto_linea        = mBcMontoDtoLinea;
        mObjTramaDEDI.total_item         = __roundNumber(Ax.math.bc.add(Ax.math.bc.sub(mBcImporteNetoLinea, mBcMontoDtoLinea), mBcImpuestoLinea));

        //======================================================================
        // Identificación de los campos para mObjTramaFacturaDEIM 
        //======================================================================
        var mObjTramaDEIM  = {};
        mObjTramaDEIM.monto_igv_item     = mBcImpuestoLinea;
        mObjTramaDEIM.afectacion_igv     = Ax.math.bc.sub(mBcImporteNetoLinea, mBcMontoDtoLinea);
        mObjTramaDEIM.tasa_igv           = __roundNumber(mRowLineInvoice.tasa_impuesto);
        mObjTramaDEIM.tipo_impuesto      = mObjTaxType.tipo_impuesto;
        mObjTramaDEIM.sistema_isc        = '';
        mObjTramaDEIM.cod_afectacion_igv = mObjTaxType.cod_afecta_igv;
        mObjTramaDEIM.id_tributo         = mObjTaxType.id_tributo;
        mObjTramaDEIM.nom_tributo        = mObjTaxType.nom_tributo;
        mObjTramaDEIM.nom_int_tributo    = mObjTaxType.nom_int_tributo;
        mObjTramaDEIM.cant_bag_plastico  = '';
        mObjTramaDEIM.monto_unitario     = '';

        //======================================================================
        // Adición de DE - DEDI - DEIM de cada ITEM a mArrTramaITEMS
        //======================================================================
        mArrTramaITEMS.push({ mObjTramaDE, mObjTramaDEDI, mObjTramaDEIM });
    }

    //==========================================================================
    // Identificación de los campos para mArrTramaDI
    //==========================================================================
    for (var i = 0; i < pArrTaxInvoice.length; i++) {
        mArrTramaDI[i] = {};
        mArrTramaDI[i].total_impuestos = pObjHeadInvoice.total_impuestos;
        mArrTramaDI[i].suma_tributo    = pArrTaxInvoice[i].suma_tributo;
        mArrTramaDI[i].id_tributo      = __setObjectTaxType(pArrTaxInvoice[i].tipo_impuesto).id_tributo;
        mArrTramaDI[i].nom_tributo     = __setObjectTaxType(pArrTaxInvoice[i].tipo_impuesto).nom_tributo;
        mArrTramaDI[i].nom_int_tributo = __setObjectTaxType(pArrTaxInvoice[i].tipo_impuesto).nom_int_tributo;
        mArrTramaDI[i].monto_base      = pArrTaxInvoice[i].monto_base;
    }

    //==========================================================================
    // Identificación de los campos para mObjTramaRE
    //==========================================================================
    mObjTramaRE.serie_correlativo_ref = pObjHeadInvoice.documento_referencia;
    mObjTramaRE.fecha_emision_ref     = pObjHeadInvoice.fecha_emision_ref;
    mObjTramaRE.tipo_documento_ref    = pObjHeadInvoice.tipo_documento_ref;
    
    //==========================================================================
    // Identificación de los campos para mObjTramaFP
    //==========================================================================
    mObjTramaFP.cuotas = [];
    
    mObjTramaFP.forma_pago = pObjHeadInvoice.forma_pago;
    
    if(mObjTramaFP.forma_pago == 'Credito') {
        mObjTramaFP.cuotas = pObjHeadInvoice.cuotas;
    }
    
    //==========================================================================
    // Identificación de los campos para mObjTramaDET
    //==========================================================================
    mObjTramaDET.monto_det = 0;
    
    if (pObjHeadInvoice.existe_detraccion) {
        mObjTramaDET.cod_bienser_det  = pObjHeadInvoice.cod_bienser_det;
        mObjTramaDET.porcen_det       = pObjHeadInvoice.porcen_det;
        mObjTramaDET.monto_det        = pObjHeadInvoice.monto_det;
        mObjTramaDET.tipo_moneda      = pObjHeadInvoice.tipo_moneda;
        mObjTramaDET.cuenta_corriente = pObjHeadInvoice.cuenta_detraccion_emisor;
        mObjTramaDET.medio_pago       = '001';
    }

    //==========================================================================
    // Identificación de los campos para mObjTramaPE
    //==========================================================================
    if (pObjHeadInvoice.tipo_documento == '01') {
        mObjTramaPE.plantilla = 'T01_ch.jasper';
    }
    if (pObjHeadInvoice.tipo_documento == '03') {
        mObjTramaPE.plantilla = 'T03_ch.jasper';
    }
    if (pObjHeadInvoice.tipo_documento == '07') {
        mObjTramaPE.plantilla = 'T07_ch.jasper';
    }

    mObjTramaPE.web_emi        = pObjHeadInvoice.web_emi != null ? pObjHeadInvoice.web_emi.replace('http://', '') : '';
    mObjTramaPE.tel_emi        = pObjHeadInvoice.tel_emi != null ? pObjHeadInvoice.tel_emi.replace('(511) ', '') : '' + ' -  Fax: ' + pObjHeadInvoice.fax_emi != null ? pObjHeadInvoice.fax_emi.replace('(511) ', '') : '';
    mObjTramaPE.correo_cliente = mStrEmailReceptor;
    mObjTramaPE.titulo         = 'INGRESOS VARIOS';
    mObjTramaPE.pag_web        = 'http://asp403r.paperless.com.pe/BoletaCRP';
    mObjTramaPE.nom_paciente   = '';
    mObjTramaPE.dir_paciente   = '';
    mObjTramaPE.poliza         = '';
    mObjTramaPE.nom_titular    = '';
    mObjTramaPE.trabajo        = '';
    mObjTramaPE.nro_admision   = '';
    mObjTramaPE.subtotal       = pObjHeadInvoice.valor_total;
    
    /*let mStrAmbito = Ax.db.executeGet(`<select>
                                			<columns>
                                				CASE WHEN SUBSTR(einvoice_pac_admision,1,1) = 'U' THEN 'U'
                                                     WHEN SUBSTR(einvoice_pac_admision,1,1) = 'C' THEN 'C'
                                				ELSE 'H'
                                                END ambito
                                			</columns>
                                			<from table = 'pe_einvoice_extend' />
                                			<where>
                                				einvoice_cabori = ?
                                			</where>
                                		</select>`,pObjHeadInvoice.id_factura);*/
    
    if (pObjHeadInvoice.tabori_factura == 'cvenfach') {
        mObjTramaPE.plantilla = 'T01.jasper';
        if(pObjHeadInvoice.tipologia_documento  == 'FVDA' || 
           pObjHeadInvoice.tipologia_documento  == 'FVDI' ||
           pObjHeadInvoice.tipologia_documento  == 'FVHA' ||
           pObjHeadInvoice.tipologia_documento  == 'FVHI' ||
           pObjHeadInvoice.tipologia_documento  == 'FDHA' ||
           pObjHeadInvoice.tipologia_documento  == 'FDHI' ){
        
           mObjTramaPE.titulo  = 'HOSPITALARIO';
           
        }else if(pObjHeadInvoice.tipologia_documento  == 'FVEA' ||
                 pObjHeadInvoice.tipologia_documento  == 'FVEI' ||
                 pObjHeadInvoice.tipologia_documento  == 'FDEA' ||
                 pObjHeadInvoice.tipologia_documento  == 'FDEI' ){
                 mObjTramaPE.titulo = 'EMERGENCIA';
                 
        }else if(pObjHeadInvoice.tipologia_documento  == 'BVEA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BVEI' ||
                 pObjHeadInvoice.tipologia_documento  == 'BDEA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BDEI' ){
                 mObjTramaPE.plantilla = 'T03.jasper';
                 mObjTramaPE.titulo = 'EMERGENCIA';
            
        }else if(pObjHeadInvoice.tipologia_documento  == 'NCRE' || 
                 pObjHeadInvoice.tipologia_documento  == 'NCRD'){
           // NOTA DE CREDITO FACTURA
                mObjTramaPE.plantilla = 'T07_ch.jasper';
                mObjTramaPE.titulo = 'HOSPITALARIO';
                if(pObjHeadInvoice.ambito == 'U'){
                    mObjTramaPE.titulo = 'EMERGENCIA';
                }else if(pObjHeadInvoice.ambito == 'C'){
                     mObjTramaPE.titulo = 'AMBULATORIO';
                }
                
        }else if(pObjHeadInvoice.tipologia_documento  == 'BVHA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BVHI' ||
                 pObjHeadInvoice.tipologia_documento  == 'BVDI' ||
                 pObjHeadInvoice.tipologia_documento  == 'BVDA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BDHA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BDHI' ){
                mObjTramaPE.plantilla = 'T03.jasper';
                mObjTramaPE.titulo = 'HOSPITALARIO';
                
        }else if(pObjHeadInvoice.tipologia_documento  == 'BCRE' ||
                 pObjHeadInvoice.tipologia_documento  == 'BCRD'){
            //NOTA DE CREDITO BOLETAS
                mObjTramaPE.plantilla = 'T07_ch.jasper';
                mObjTramaPE.titulo = 'HOSPITALARIO';
                if(pObjHeadInvoice.ambito == 'U'){
                    mObjTramaPE.titulo = 'EMERGENCIA';
                }else if(pObjHeadInvoice.ambito == 'C'){
                     mObjTramaPE.titulo = 'AMBULATORIO';
                }
        }else if(pObjHeadInvoice.tipologia_documento  == 'BVAA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BVAI' ||
                 pObjHeadInvoice.tipologia_documento  == 'BDAA' ||
                 pObjHeadInvoice.tipologia_documento  == 'BDAI'){
                     
                mObjTramaPE.plantilla = 'T03_ch.jasper';
                mObjTramaPE.titulo = 'AMBULATORIO';
                
        }else if(pObjHeadInvoice.tipologia_documento  == 'FVAA' ||
                 pObjHeadInvoice.tipologia_documento  == 'FVAI' ||
                 pObjHeadInvoice.tipologia_documento  == 'FDAA' ||
                 pObjHeadInvoice.tipologia_documento  == 'FDAI'){
                 mObjTramaPE.plantilla = 'T01_ch.jasper';
                 mObjTramaPE.titulo = 'AMBULATORIO';
            
        }else if(pObjHeadInvoice.tipologia_documento == 'FVPC' || 
                 pObjHeadInvoice.tipologia_documento == 'FDPM'){
                 //PARA PACIENTE MES 
                 mObjTramaPE.plantilla = 'T01_ch.jasper';
                  if(pObjHeadInvoice.ambito == 'U'){
                    mObjTramaPE.titulo = 'EMERGENCIA';
                }else if(pObjHeadInvoice.ambito == 'C'){
                     mObjTramaPE.titulo = 'AMBULATORIO';
                }
                 //mObjTramaPE.titulo = 'PACIENTE MES';
                
        }
        
        mObjTramaPE.nom_paciente   = pObjHeadInvoice.nom_paciente   != null ? pObjHeadInvoice.nom_paciente : '';
        mObjTramaPE.dir_paciente   = pObjHeadInvoice.dir_paciente   != null ? pObjHeadInvoice.dir_paciente : '';
        mObjTramaPE.poliza         = pObjHeadInvoice.poliza         != null ? pObjHeadInvoice.poliza       : '';
        mObjTramaPE.nom_titular    = pObjHeadInvoice.nom_titular    != null ? pObjHeadInvoice.nom_titular  : '';
        mObjTramaPE.trabajo        = pObjHeadInvoice.trabajo        != null ? pObjHeadInvoice.trabajo      : '';
        mObjTramaPE.nro_admision   = pObjHeadInvoice.nro_admision   != null ? pObjHeadInvoice.nro_admision : '';
        mObjTramaPE.fecha_ingreso  = pObjHeadInvoice.fecha_ingreso  != null ? new Ax.util.Date(pObjHeadInvoice.fecha_ingreso).format('YYYY-MM-dd') : '';
        mObjTramaPE.fecha_egreso   = pObjHeadInvoice.fecha_egreso   != null ? new Ax.util.Date(pObjHeadInvoice.fecha_egreso).format('YYYY-MM-dd')  : '';
        mObjTramaPE.tipo_egreso    = pObjHeadInvoice.tipo_egreso    != null ? pObjHeadInvoice.tipo_egreso  : '';
        mObjTramaPE.cama           = pObjHeadInvoice.cama           != null ? pObjHeadInvoice.cama         : '';
        mObjTramaPE.dias           = (pObjHeadInvoice.fecha_ingreso != null && 
                                      pObjHeadInvoice.fecha_egreso  != null) ? new Ax.util.Date(pObjHeadInvoice.fecha_ingreso).days(new Ax.util.Date(pObjHeadInvoice.fecha_egreso)) : 0;
        
    }
    console.log(mObjTramaEN.total_impuestos);
    //==========================================================================
    // Armado de la linea EN de la trama a partir mObjTramaEN
    //==========================================================================
    let mLineEN = (
        'EN|' 
        + mObjTramaEN.tipo_documento                                                                + '|'
        + mObjTramaEN.serie_correlativo                                                             + '|'
        + mObjTramaEN.tipo_nota                                                                     + '|'
        + mObjTramaEN.documento_referencia                                                          + '|'
        + mObjTramaEN.sustento                                                                      + '|'
        + mObjTramaEN.fecha_emision                                                                 + '|'
        + mObjTramaEN.tipo_moneda                                                                   + '|'
        + mObjTramaEN.ruc_emisor                                                                    + '|'
        + mObjTramaEN.tip_id_emisor                                                                 + '|'
        + mObjTramaEN.nom_com_emisor                                                                + '|'
        + `<![CDATA[${mObjTramaEN.razon_social}]]>|`
        + mObjTramaEN.codigo_ubigeo                                                                 + '|'
        + `<![CDATA[${mObjTramaEN.direccion_emisor}]]>|`
        + mObjTramaEN.departamento_emisor                                                           + '|'
        + mObjTramaEN.provincia_emisor                                                              + '|'
        + mObjTramaEN.distrito_emisor                                                               + '|'
        + mObjTramaEN.num_id_adquiriente                                                            + '|'
        + mObjTramaEN.tipo_id_adquiriente                                                           + '|'
        + `<![CDATA[${mObjTramaEN.full_nom_adquiriente}]]>|`
        + mObjTramaEN.direccion_receptor                                                            + '|'
        + Ax.math.bc.of(mObjTramaEN.valor_total_venta).setScale(2, Ax.math.bc.RoundingMode.HALF_UP) + '|'
        + Ax.math.bc.of(mObjTramaEN.total_impuestos).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)   + '|'
        + mObjTramaEN.monto_descuentos                                                              + '|'
        + mObjTramaEN.monto_recargos                                                                + '|'
        + Ax.math.bc.of(mObjTramaEN.importe_total).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)     + '|'
        + mObjTramaEN.cod_otros_tributos                                                            + '|'
        + Ax.math.bc.of(mObjTramaEN.valor_neto_venta).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)  + '|'
        + mObjTramaEN.num_doc_comprador                                                             + '|'
        + mObjTramaEN.tip_doc_comprador                                                             + '|'
        + mObjTramaEN.cod_pais_emisor                                                               + '|' 
        + mObjTramaEN.urbanizacion_emisor
    ).slice(0) + ' \n' ;
    
    //==========================================================================
    // Armado de la linea ENEX de la trama a partir mObjTramaENEX
    //==========================================================================
    let mLineENEX = (
        'ENEX|' 
        + mObjTramaENEX.version_ubl        + '|'
        + mObjTramaENEX.tipo_operacion     + '|'
        + mObjTramaENEX.orden_compra       + '|'
        + mObjTramaENEX.redondeo           + '|'
        + mObjTramaENEX.total_anticipos    + '|'
        + mObjTramaENEX.hora_emision       + '|'
        + mObjTramaENEX.fecha_vencimiento  + '|'
        + mObjTramaENEX.codigo_sunat       + '|'
       // + mObjTramaENEX.importe_total      + '|'
        + Ax.math.bc.of(mObjTramaENEX.importe_total).setScale(3, Ax.math.bc.RoundingMode.HALF_UP) + '|'
        + mObjTramaENEX.num_doc_asociados  + '|'
        + mObjTramaENEX.tip_doc_asociados  + '|'
        + mObjTramaENEX.full_nom_asociados 
    ).slice(0) + ' \n' ;
    //ENEX  1|2.1  2|1001 3|  4|   5|   6|  7|  8|0000  9|7737.180  10|  11|  12|  13
    //==========================================================================
    // Armado de la linea DN de la trama a partir mObjTramaDN
    //==========================================================================
    let mLineDN = (
        'DN|' 
        + mObjTramaDN.num_linea_nota + '|'
        + mObjTramaDN.codigo_leyenda + '|'
        + mObjTramaDN.glosa_leyenda
    ).slice(0) + ' \n' ;
    
    if (pObjHeadInvoice.existe_detraccion) {
        mLineDN += (
            'DN|' 
            + mObjTramaDN.num_linea_det      + '|'
            + mObjTramaDN.codigo_leyenda_det + '|'
            + mObjTramaDN.glosa_leyenda_det
        ).slice(0) + ' \n' ;
    }
    
    //==========================================================================
    // Armado de cada ITEM de la trama a partir mArrTramaITEMS
    //==========================================================================
    var mLineITEMS = '';
    
    for(let mRowTramaITEM of mArrTramaITEMS){
    
        //======================================================================
        // Armado de la linea DE de la trama a partir mObjTramaDE
        //======================================================================  
        mLineITEMS += (
            'DE|'
            + mRowTramaITEM.mObjTramaDE.item_correlativo  + '|'
            + mRowTramaITEM.mObjTramaDE.precio_ven_uni    + '|'
            + mRowTramaITEM.mObjTramaDE.unidad_medida     + '|'
            + mRowTramaITEM.mObjTramaDE.cantidad_item     + '|'
            + mRowTramaITEM.mObjTramaDE.valor_venta       + '|'
            + mRowTramaITEM.mObjTramaDE.codigo_item       + '|'
            + mRowTramaITEM.mObjTramaDE.tipo_precio_venta + '|'
            + mRowTramaITEM.mObjTramaDE.valor_venta_item  + '|'
            + mRowTramaITEM.mObjTramaDE.valor_venta       + '|'
            + mRowTramaITEM.mObjTramaDE.nro_lote          + '|'
            + mRowTramaITEM.mObjTramaDE.marca             + '|'
            + mRowTramaITEM.mObjTramaDE.pais_origen 
        ).slice(0) + ' \n';
    
        //======================================================================
        // Armado de la linea DEDI de la trama a partir mObjTramaDEDI
        //======================================================================
        mLineITEMS += (
            'DEDI|'   
            + `<![CDATA[${mRowTramaITEM.mObjTramaDEDI.descripcion_item}]]>|` 
            + mRowTramaITEM.mObjTramaDEDI.nota_adicional     + '|'
            + mRowTramaITEM.mObjTramaDEDI.nom_concepto       + '|' 
            + mRowTramaITEM.mObjTramaDEDI.cod_concepto       + '|'  
            + mRowTramaITEM.mObjTramaDEDI.num_placa_vehiculo + '|' 
            + mRowTramaITEM.mObjTramaDEDI.cod_producto_sunat + '|' 
            + mRowTramaITEM.mObjTramaDEDI.cod_producto_gs1   + '|' 
            + mRowTramaITEM.mObjTramaDEDI.tip_estruc_gtin  
            
            //DEDI  1|HONORARIOS POR SERVICIOS AUXILIARES  2|  3|  4|  5|  6| 85101500 7| 8|
        ).slice(0) + ' \n';
    
        mLineITEMS += (
            'DEDI|0 \n' +
            'DEDI|0 \n' +
            'DEDI|' + mRowTramaITEM.mObjTramaDEDI.porcen_dto_linea + '\n' +
            'DEDI|' + mRowTramaITEM.mObjTramaDEDI.dscto_linea      + '\n' +
            'DEDI|' + mRowTramaITEM.mObjTramaDEDI.total_item
        ).slice(0) + ' \n';
    
        //======================================================================
        // Armado de la linea DEIM de la trama a partir mObjTramaDEIM
        //======================================================================
        mLineITEMS += (
            'DEIM|'
            + mRowTramaITEM.mObjTramaDEIM.monto_igv_item     + '|'
            + mRowTramaITEM.mObjTramaDEIM.afectacion_igv     + '|'
            + mRowTramaITEM.mObjTramaDEIM.monto_igv_item     + '|'
            + mRowTramaITEM.mObjTramaDEIM.tasa_igv           + '|'
            + mRowTramaITEM.mObjTramaDEIM.tipo_impuesto      + '|'
            + mRowTramaITEM.mObjTramaDEIM.cod_afectacion_igv + '|'
            + mRowTramaITEM.mObjTramaDEIM.sistema_isc        + '|'
            + mRowTramaITEM.mObjTramaDEIM.id_tributo         + '|'
            + mRowTramaITEM.mObjTramaDEIM.nom_tributo        + '|'
            + mRowTramaITEM.mObjTramaDEIM.nom_int_tributo    + '|'
            + mRowTramaITEM.mObjTramaDEIM.cant_bag_plastico  + '|'
            + mRowTramaITEM.mObjTramaDEIM.monto_unitario
        ).slice(0) + ' \n';
    }
    
    //==========================================================================
    // Armado de la linea DI de la trama a partir mArrTramaDI
    //==========================================================================
    let mLineDI = '';
    
    for (i = 0; i < mArrTramaDI.length; i++) {
        console.log('*DI*', mArrTramaDI[i].total_impuestos);
        mLineDI += (
            'DI|' 
            + Ax.math.bc.of(mArrTramaDI[i].total_impuestos).setScale(2, Ax.math.bc.RoundingMode.HALF_UP) + '|'
            + Ax.math.bc.of(mArrTramaDI[i].suma_tributo).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)    + '|'
            + mArrTramaDI[i].id_tributo                                                                  + '|'
            + mArrTramaDI[i].nom_tributo                                                                 + '|'
            + mArrTramaDI[i].nom_int_tributo                                                             + '|'
            + Ax.math.bc.of(mArrTramaDI[i].monto_base).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)
        ).slice(0) + ' \n' ;
    }
    
    //==========================================================================
    // Armado de la linea RE de la trama a partir mObjTramaRE
    //==========================================================================
    let mLineRE = '';
    
    if (mObjTramaEN.tipo_documento == '07') {
        mLineRE += (
            'RE|' 
            + mObjTramaRE.serie_correlativo_ref + '|'
            + mObjTramaRE.fecha_emision_ref     + '|'
            + mObjTramaRE.tipo_documento_ref    + '|'
        ).slice(0) + ' \n' ;    
    }
    
    //==========================================================================
    // Armado de la linea FP de la trama a partir mObjTramaFP
    //==========================================================================
    let mLineFP = '';
    
    if (pObjHeadInvoice.tipo_documento == '01' || pObjHeadInvoice.tipo_documento == '03') {
        mLineFP = (
            'FP|FormaPago|' 
            + mObjTramaFP.forma_pago + '|'
            + __roundNumber(Ax.math.bc.sub(pObjHeadInvoice.importe_total, mObjTramaDET.monto_det))
        ).slice(0) + ' \n' ;
        
        for(var i = 0; i < mObjTramaFP.cuotas.length; i++) {
            var mStrCorr = NumberFormatUs.format(i+1, "000");
            mLineFP += (
                'FP|FormaPago|' 
                + 'Cuota' + mStrCorr + '|'
                + __roundNumber(mObjTramaFP.cuotas[i].importe) + '|'
                + mObjTramaFP.cuotas[i].fecha                  + '|'
            ).slice(0) + ' \n' ;
        }
    }    
    
    //==========================================================================
    // Armado de la linea PE de la trama a partir mObjTramaPE
    //==========================================================================
    if (pObjHeadInvoice.tabori_factura == 'cvenfach') {
        var mLinePE = (
            'PE|Plantilla|'     + mObjTramaPE.plantilla                                                             + ' \n' + 
            'PE|WebEmi|'        + mObjTramaPE.web_emi                                                               + ' \n' + 
            'PE|TelEmi|'        + mObjTramaPE.tel_emi                                                               + ' \n' + 
            'PE|Titulo|'        + mObjTramaPE.titulo                                                                + ' \n' + 
            'PE|CorreoCliente|' +`<![CDATA[${mObjTramaPE.correo_cliente}]]>|`                                       + ' \n' + 
            'PE|PagWeb|'        + mObjTramaPE.pag_web                                                               + ' \n' +
            'PE|SubTotal|'      + Ax.math.bc.of(mObjTramaPE.subtotal).setScale(3, Ax.math.bc.RoundingMode.HALF_UP)  + ' \n' +
            'PE|Etiqueta1|Nombre del Paciente'                                                                      + ' \n' +        
            'PE|Valor1|'        +`<![CDATA[${mObjTramaPE.nom_paciente }]]>|`                                        + ' \n' +
            'PE|Etiqueta2|Dirección del Paciente'                                                                   + ' \n' +
            'PE|Valor2|'        +`<![CDATA[${mObjTramaPE.dir_paciente}]]>|`                                         + ' \n' +
            'PE|Etiqueta3|N° Trabajador/Póliza'                                                                     + ' \n' +
            'PE|Valor3|'        + mObjTramaPE.poliza                                                                + ' \n' +
            'PE|Etiqueta4|Cama'                                                                                     + ' \n' +
            'PE|Valor4|'        +`<![CDATA[${mObjTramaPE.cama}]]>|`                                                 + ' \n' +
            'PE|Etiqueta5|Nombre del Titular'                                                                       + ' \n' +
            'PE|Valor5|'        +`<![CDATA[${mObjTramaPE.nom_titular}]]>|`                                          + ' \n' +
            'PE|Etiqueta6|Centro de Trabajo'                                                                        + ' \n' +
            'PE|Valor6|'        +`<![CDATA[${mObjTramaPE.trabajo}]]>|`                                              + ' \n' +
            'PE|Etiqueta7|Nro. de Admisión'                                                                         + ' \n' +
            'PE|Valor7|'        +`<![CDATA[${mObjTramaPE.nro_admision}]]>|`                                         + ' \n' +
            'PE|Etiqueta8|Tipo Egreso'                                                                              + ' \n' +
            'PE|Valor8|'        +`<![CDATA[${mObjTramaPE.tipo_egreso}]]>|`                                          + ' \n' +
            'PE|Etiqueta9|Fecha de Ingreso'                                                                         + ' \n' +
            'PE|Valor9|'        + mObjTramaPE.fecha_ingreso                                                         + ' \n' +
            'PE|Etiqueta10|Fecha de Egreso'                                                                         + ' \n' +
            'PE|Valor10|'       + mObjTramaPE.fecha_egreso                                                          + ' \n' +
            'PE|Etiqueta11|Dias'                                                                                    + ' \n' +
            'PE|Valor11|'       + mObjTramaPE.dias          
        ).slice(0) + ' \n' ;
    }
    
           
    
    if (pObjHeadInvoice.tabori_factura == 'gvenfach') {
        var mLinePE = (
            'PE|Plantilla|'     + mObjTramaPE.plantilla      + ' \n' + 
            'PE|WebEmi|'        + mObjTramaPE.web_emi        + ' \n' + 
            'PE|TelEmi|'        + mObjTramaPE.tel_emi        + ' \n' + 
            'PE|Titulo|'        + mObjTramaPE.titulo         + ' \n' + 
            'PE|CorreoCliente|' + mObjTramaPE.correo_cliente + ' \n' + 
            'PE|PagWeb|'        + mObjTramaPE.pag_web        + ' \n' +
            'PE|SubTotal|'      + mObjTramaPE.subtotal       + ' \n' +
            'PE|Etiqueta1|Nombre del Paciente'               + ' \n' +        
            'PE|Valor1|'        + mObjTramaPE.nom_paciente   + ' \n' +
            'PE|Etiqueta2|Dirección del Paciente'            + ' \n' +
            'PE|Valor2|'        + mObjTramaPE.dir_paciente   + ' \n' +
            'PE|Etiqueta3|N° Trabajador/Póliza'              + ' \n' +
            'PE|Valor3|'        + mObjTramaPE.poliza         + ' \n' +
            'PE|Etiqueta5|Nombre del Titular'                + ' \n' +
            'PE|Valor5|'        + mObjTramaPE.nom_titular    + ' \n' +
            'PE|Etiqueta6|Centro de Trabajo'                 + ' \n' +
            'PE|Valor6|'        + mObjTramaPE.trabajo        + ' \n' +
            'PE|Etiqueta7|Nro. de Admisión'                  + ' \n' +
            'PE|Valor7|'        + mObjTramaPE.nro_admision         
        ).slice(0) + ' \n' ;
    }
    
    //==========================================================================
    // Armado de la linea PESD
    //==========================================================================
    var mStrModalidadPago = '';
    
    var mStrSpotCtaCte    = '';
    
    var mLineDET          = ''; 
    
    //==========================================================================
    // Líneas para el tipo de documento: Factura [dockey == '01'] 
    //==========================================================================
    if (mObjTramaEN.tipo_documento == '01') {
        mStrModalidadPago += 'PESD|1|Modalidad de Pago: ' + (mObjTramaFP.forma_pago || "") + ' \n';
    
        if (pObjHeadInvoice.existe_detraccion) {
            mStrSpotCtaCte += `PESD|1|OPERACIONES SUJETAS AL SPOT CON EL GOBIERNO CENTRAL BCO. DE LA NACIÓN CTA. CTE. Nº ${pObjHeadInvoice.cuenta_detraccion_emisor}.\n`;
            
            //==================================================================
            // Armado de la linea DET
            //==================================================================
            mLineDET = (
                'DET|' 
                + mObjTramaDET.cod_bienser_det                                                         + '|'
                + mObjTramaDET.cuenta_corriente                                                        + '|'
                + Ax.math.bc.of(mObjTramaDET.porcen_det).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)  + '|'
                + Ax.math.bc.of(mObjTramaDET.monto_det).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)   + '|'
                + mObjTramaDET.tipo_moneda                                                             + '|'
                + mObjTramaDET.medio_pago                                                              + '|'
                + 'Detraccion|Detraccion'
            ).slice(0) + ' \n' ;
            //DET  1|037  2|00000732842  3|12.00  4|928.00  5|PEN  6|001  7|Detraccion|Detraccion
        };
    };
    
    var mPESD = 'PESD|3|No se aceptan canjes de comprobantes de pago. Conservar su comprobante de pago ante cualquier devolución.';
    if(mDedTot > 0){
        mPESD =  'PESD|3|Modalidad de Pago : PAGO POR SERVICIO. Pago del Paciente: '+__roundNumber(mDedTot)+'.'+' \n' + 
                  'PESD|4|No se aceptan canjes de comprobantes de pago. Conservar su comprobante de pago ante cualquier devolución.';
         if (pObjHeadInvoice.modo_pago == 'P'){
            mPESD =  'PESD|3|Modalidad de Pago : PACIENTE MES. Pago del Paciente: '+__roundNumber(mDedTot)+'.'+' \n' + 
                     'PESD|4|No se aceptan canjes de comprobantes de pago. Conservar su comprobante de pago ante cualquier devolución.';
            }
    }
    
    let mLinePESD = (
        'PES|MensajesAt|'                                                                                                  + ' \n' +
         mStrSpotCtaCte                                                                                                            +
         mStrModalidadPago                                                                                                         +
       /*'PESD|2|OBSERVACIONES: Emitido por: ' + Ax.db.getUser()                                                            + ' \n' + */
        'PESD|2|OBSERVACIONES: Emitido por: ' + pObjHeadInvoice.usuario_creador                                            + ' \n' +
        mPESD
    ).slice(0) + ' \n' ;
    
    //==========================================================================
    // Armado del cuerpo de la trama para el documento que se enviará
    //==========================================================================
    let mStrContentTXT = mLineEN + mLineENEX + mLineDN + mLineITEMS + mLineDI + mLineRE + mLineFP + mLineDET + mLinePE + mLinePESD;
    
    return mStrContentTXT;
}












// ID DE FACTURA

// EndPoint: https://asp4demos.paperless.com.pe/axis2/services/Online?wsdl

var pIntCabid = 2222669; // MALO -2163.87
// var pIntCabid = 1576993; // BUENO

let mObjHeadInvoice = Ax.db.executeQuery(`
		<select first = '1'>
			<columns>
				'cvenfach'										tabori_factura,
				cvenfach.facidx									id_factura,
				cvenfacd.dockey									tipo_documento,
				cvenfacd.codcon                                 concepto_origen,
				cvenfach.tipdoc									tipologia_documento,
				cvenfach.docser									serie_correlativo,
				cvenfach.fecfac									fecha_emision,
				cvenfach.moneda									tipo_moneda,
				cvenfach.tipefe									tipo_efecto,
				cvenfach.zimter									zona_tercero,
				cvenfach.user_created							usuario_creador,
				
				CASE WHEN cvenfach.tippag = '0' THEN 'Contado'
					ELSE 'Credito'
				END												forma_pago,
				
				CASE WHEN cvenfach.contab IS NOT NULL
					THEN 1
					ELSE 0
				END												esta_contabilizado,
				
				cvenfach.loteid                                 lote_contable,
				cvenfach.impres                                 fach_impreso,
                
				cvenfach.docrec									documento_referencia,
				gdocrec.fecfac									fecha_emision_ref,
				gdocrec.dockey									tipo_documento_ref,
				
				cvenfach.empcode								codigo_empresa,
				cvenfach.proyec									delegacion,
				cvenfach.seccio									departamento,
				cvenfach.tipdir									direccion,
				cempresa.tercer,
				cvenfach.emp_cif								ruc_emisor,
				cvenfach.emp_ciftyp								tip_id_emisor,
				cempresa.empname								razon_social_emisor,
				cempresa.nomcom									nom_com_emisor,
				cempresa.cifiss									cod_pais_emisor,
				cempresa.telef1									tel_emi,
				cempresa.fax1									fax_emi,
				cempresa.web									web_emi,
				INITCAP(cterdire.direcc)						direccion_emisor,
				INITCAP(cterdire.distri)						distrito_emisor,
				INITCAP(cterdire.region)						provincia_emisor,
				INITCAP(cterdire.depart)						departamento_emisor,
				cterbanc.iban									cuenta_detraccion_emisor,

				cvenfach.cif									num_id_adquiriente,
				cvenfach.ciftyp									tipo_id_adquiriente,
				cvenfach.nombre									full_nom_adquiriente,
				
				<!-- Correo electrónico del tercero -->
				cvenfach.tercer									codigo_tercero,
				ccontact.email1									correo_tercero,
                
				cvenfach.direcc									direccion_receptor,
                
				(SELECT MAX(cvenefec.fecven)
				FROM cvenefec 
				WHERE cvenefec.facidx = cvenfach.facidx)		fecha_vencimiento,
				
				  <!-- Campos necesarios para una nota de crédito -->
                sunat.credit_code                               tipo_nota,
                UPPER(sunat.credit_desc)                        tipo_nota_sustento,
				
				<!-- Campos necesarios si existe detracción -->
				ctax_rule.rule_keyart							cod_bienser_det,
				ABS(cvenfach_tax.tax_porcen)					porcen_det,
				ABS(cvenfach_tax.tax_cuoded)					monto_det,
				CASE WHEN cvenfach_tax.facidx IS NOT NULL
					THEN 1
					ELSE 0
				END												existe_detraccion,
				
				<!-- Importes -->
				cvenfach.dtocab*ABS(cvenfach.impnet)/100		monto_descuentos,
				ABS(cvenfach.imptot)							importe_total,
				ABS(cvenfach.impnet)							valor_total,
				(SELECT SUM(CASE WHEN cvenfach_tax.tax_cuoded &gt;= 0 
								THEN cvenfach_tax.tax_cuoded
								WHEN cvenfach_tax.tax_cuoded &lt; 0 
								AND cvenfach.dockey = '07' 
								THEN cvenfach_tax.tax_cuoded * (-1)
								WHEN cvenfach_tax.tax_cuoded &lt; 0 
                                AND cvenfach_tax.tax_code NOT LIKE 'D%' 
                                THEN cvenfach_tax.tax_cuoded 
								ELSE 0.00 
							END)
				FROM cvenfach_tax
				WHERE cvenfach_tax.facidx	= cvenfach.facidx)	total_impuestos,
				
				<!-- Datos paciente pe_einvoice_extend -->
					
				pe_einvoice_extend.einvoice_pac_nombre	        nom_paciente,
				pe_einvoice_extend.einvoice_pac_direcc          dir_paciente,
				pe_einvoice_extend.einvoice_pac_titular         nom_titular,
				pe_einvoice_extend.einvoice_pac_poliza	        poliza,
				pe_einvoice_extend.einvoice_pac_centro	        trabajo,
				pe_einvoice_extend.einvoice_pac_admision	    nro_admision,
				pe_einvoice_extend.einvoice_pac_cama            cama,
				pe_einvoice_extend.einvoice_pac_fec_ingreso     fecha_ingreso,
				pe_einvoice_extend.einvoice_pac_fec_egreso	    fecha_egreso,
				pe_einvoice_extend.einvoice_pac_tipo_egreso     tipo_egreso,
                pe_einvoice_extend.einvoice_motivo_nc_sunat     motivo_sunat_nc,
                pe_einvoice_extend.einvoice_mod_pago            modo_pago,
                
                CASE WHEN ABS(cvenfach.imptot) BETWEEN 0.01 AND 0.06  THEN 0
                    ELSE 1
                    END AS comparar_monto_total,
                CASE WHEN SUBSTR(einvoice_pac_admision,1,1) = 'U' THEN 'U'
                     WHEN SUBSTR(einvoice_pac_admision,1,1) = 'C' THEN 'C'
                     WHEN (SUBSTR(einvoice_pac_admision,1,1) = 'H' OR 
                           SUBSTR(einvoice_pac_admision,1,1) = 'A' OR
                           SUBSTR(einvoice_pac_admision,1,1) = 'D' ) THEN 'H'
                     ELSE 'P'
                    END ambito,
                    
                CASE WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 1    THEN 'ENERO'     ||
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 2    THEN 'FEBRERO'   ||
                         ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 3    THEN 'MARZO'     ||
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 4    THEN 'ABRIL'     || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 5    THEN 'MAYO'      || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 6    THEN 'JUNIO'     || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 7    THEN 'JULIO'     || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 8    THEN 'AGOSTO'    || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 9    THEN 'SEPTIEMBRE'||
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 10    THEN 'OCTUBRE'   || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 11    THEN 'NOVIEMBRE' || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 WHEN MONTH(pe_einvoice_extend.einvoice_pac_fec_ingreso) = 12    THEN 'DICIEMBRE' || 
                        ' - ' || YEAR(pe_einvoice_extend.einvoice_pac_fec_ingreso)
                 ELSE '-' END periodo_fac
				
			</columns>
			<from table = 'cvenfach'>
				<join table = 'ctercero'>
					<on>cvenfach.tercer = ctercero.codigo</on>
					<join type = 'left' table = 'ccontact'>
						<on>ctercero.codigo = ccontact.tercer</on>
						<on>ccontact.tipdir = '0'</on>
					</join>
				</join>
				<join table = 'cvenfacd'>
					<on>cvenfach.tipdoc = cvenfacd.codigo</on>
				</join>
				<join table = 'cempresa'>
					<on>cvenfach.empcode = cempresa.empcode</on>
					<join table = 'cterdire'>
						<on>cempresa.tercer = cterdire.codigo</on>
					</join>
					<join type='left' table = 'cterbanc'>
						<on>cempresa.tercer = cterbanc.codigo</on>
						<on>cterbanc.estado = 'A'</on>
						<on>cterbanc.tipcta = 8</on>
						<on>cterbanc.codban = 'PE0018'</on>
					</join>
				</join>

				<join type = 'left' table = 'cvenfach_tax'>
					<on>cvenfach_tax.facidx	 = cvenfach.facidx	</on>
					<join type = 'left' table = 'ctax_rule'>
						<on>cvenfach_tax.tax_rule = ctax_rule.rule_seqno</on>
					</join>
					<join table = 'ctax_type'>
						<on>cvenfach_tax.tax_code = ctax_type.type_code</on>
						<on>ctax_type.type_class  = 'DET'</on>
					</join>
				</join>
				
				<join type='left' table='cvenfach'  alias='gdocrec'>
					<on>cvenfach.docrec  = gdocrec.docser</on>
					<on>cvenfach.empcode = gdocrec.empcode</on>
					<on>cvenfach.tercer  = gdocrec.tercer</on>
					<on>cvenfach.tipdir  = gdocrec.tipdir</on>
					<on>cvenfach.fecrec  = gdocrec.fecfac</on>
					<on>cvenfach.tipdoc != gdocrec.tipdoc</on>
				</join>
				
				<join type='left' table ='pe_einvoice_extend'>
                    <on>'cvenfach' = pe_einvoice_extend.einvoice_tabori</on> 
                    <on>cvenfach.facidx = pe_einvoice_extend.einvoice_cabori</on> 
                    <join type='left' table = 'pe_sunat_facturae_cat09' alias = 'sunat'>
						<on>pe_einvoice_extend.einvoice_motivo_nc_sunat = sunat.credit_code</on>
					</join>  
				</join>
                
			</from>
			<where>
					cvenfach.facidx	= ?
				AND cterdire.tipdir	= '0'
			</where>
		</select>`, pIntCabid).toOne();
/**
	 * Se identifica la base de datos donde se ejecutará alguno de los procesos
	 * relacionados con Paperless
	 */
	mObjHeadInvoice.db_name = Ax.db.getCode();

    /**
	 * Se identifica la cantidad de líneas que tiene el comprobante
	 */
	mObjHeadInvoice.nro_lineas = Ax.db.executeGet(`
		<select>
			<columns>
				COUNT(*) 
			</columns>
			<from table = 'cvenfach'>
				<join table = 'cvenfacl'>
					<on>cvenfach.facidx = cvenfacl.facidx</on>
				</join>
			</from> 
			<where>
				cvenfach.facidx = ?
			</where>
		</select> 
	`, pIntCabid);

/**
	 * Se identifican el número de cuotas si la forma de pago es 'Credito'
	 * No se considera la detracción en los vencimientos, en tipo de efectos:
	 * Clase = 'Cobro' [ctipoefe.clase = 'C']
	 * Código Factura-E != 'Detracción' [ctipoefe.efactu != '21']
	 */
	mObjHeadInvoice.cuotas = [];
    if(mObjHeadInvoice.forma_pago == 'Credito') {
		mObjHeadInvoice.cuotas = Ax.db.executeQuery(`
			<select>
				<columns>
					cvenefec.fecven			fecha,
					ABS(cvenefec.impdiv)	importe
				</columns>
				<from table = 'cvenefec'>
					<join table = 'cvenfach'>
						<on>cvenefec.facidx = cvenfach.facidx</on>
					</join>
					<join table = 'ctipoefe'>
						<on>cvenefec.tipefe = ctipoefe.codigo</on>
						<on>ctipoefe.clase = 'C'</on>
						<on>ctipoefe.efactu != '21'</on>
					</join>
				</from> 
				<where>
					cvenfach.facidx = ?
				</where>
			</select>`, pIntCabid).toJSONArray();
	}

    var mArrCvenfacl = Ax.db.executeQuery(`
    		<select>
    			<columns>
    				cvenfacl.precio                             precio_unitario,
    				crp_unimed.codsun                           unidad_medida,
    				cvenfacl.cantid                             cantidad_item,
    				nvl(cvenfacl.dtolin,0)                      porcen_dto_axional,
    				cvenfacl.codart                             codigo_item,
    				carticul.nomart                             descripcion_item,
    				cvenfacl.tax_code1                          codigo_impuesto,
    				ctax_type.type_porcen                       tasa_impuesto,
    				cvenfacl.parest                             codigo_prod_sunat
    			</columns>
    			<from table = 'cvenfacl'>
    				<join table = 'carticul'>
    					<on>cvenfacl.codart = carticul.codart</on>
    					<join type = 'left' table = 'crp_unimed'>
    						<on>carticul.unimed = crp_unimed.codigo</on>
    					</join>
    				</join>
    				<join table = 'ctax_type'>
    					<on>cvenfacl.tax_code1 = ctax_type.type_code</on>
    				</join>
    			</from> 
    			<where>
    				cvenfacl.facidx = ?
    			</where>
    		</select>
    		`, mObjHeadInvoice.id_factura).toJSONArray();
        var mArrCvenfachTax = Ax.db.executeQuery(`
		<select>
			<columns>
				cvenfach_tax.tax_code               tipo_impuesto,
				ABS(SUM(cvenfach_tax.tax_cuoded))   suma_tributo,
				ABS(SUM(cvenfach_tax.tax_basimp))   monto_base
			</columns>
			<from table = 'cvenfach_tax'>
				<join table = 'ctax_type'>
					<on>cvenfach_tax.tax_code = ctax_type.type_code</on>
					<on>ctax_type.type_class != 'DET'</on>
				</join>
			</from>
			<where>
				cvenfach_tax.facidx = ?
			</where>
			<group>1</group>
		</select>
		`, mObjHeadInvoice.id_factura).toJSONArray();

        let mStrTagDocTxt = pe_einvoice_generateDoctxt_IFAS( mObjHeadInvoice, mArrCvenfacl, mArrCvenfachTax);



        // // =========================================================================
        // // Parámetros que necesita la plantilla pe_einvoice_online_generation
        // // docTxt        : Información del comprobante de venta
        // // tipoFoliacion : [1] Automático
        // // tipoRetorno   : [5] Bytes del PDF en base64 generado por Paperless
        // // =========================================================================
        // let mObjContentTxtOG = {
        //     docTxt        : mStrTagDocTxt,
        //     tipoFoliacion : 1,
        //     tipoRetorno   : 5
        // };

        // // =========================================================================
        // // Request para consumir el servicio web del gestor de documentos
        // // =========================================================================
        // let mXmlRequestOG = Ax.ext.freemarker.get('pe_einvoice_online_generation').process(mObjContentTxtOG);
        // console.log(mXmlRequestOG);
        // console.log(mObjHeadInvoice);
        console.log(mStrTagDocTxt);
return mStrTagDocTxt;