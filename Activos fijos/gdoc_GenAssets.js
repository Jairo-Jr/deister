/**
 *  Copyright (c) 1988-PRESENT deister software, All Rights Reserved.
 * 
 *  All information contained herein is, and remains the property of deister software.
 *  The intellectual and technical concepts contained herein are proprietary to
 *  deister software and may be covered by trade secret or copyright law.
 *  Dissemination of this information or reproduction of this material is strictly
 *  forbidden unless prior written permission is obtained from deister software.
 *  Access to the source code contained herein is hereby forbidden to anyone except
 *  current deister software employees, managers or contractors who have executed
 *  "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The notice above does not evidence any actual or intended publication
 *  for disclosure of this source code, which includes information that is confidential
 *  and/or proprietary, and is a trade secret, of deister software
 * 
 *  ANY REPRODUCTION, MODIFICATION, DISTRIBUTION, PUBLIC  PERFORMANCE,
 *  OR PUBLIC DISPLAY OF OR THROUGH USE  OF THIS  SOURCE CODE  WITHOUT THE
 *  EXPRESS WRITTEN CONSENT OF COMPANY IS STRICTLY PROHIBITED, AND IN VIOLATION
 *  OF APPLICABLE LAWS AND INTERNATIONAL TREATIES.THE RECEIPT OR POSSESSION OF
 *  THIS SOURCE CODE AND/OR RELATED INFORMATION DOES NOT CONVEY OR IMPLY ANY
 *  RIGHTS TO REPRODUCE, DISCLOSE OR DISTRIBUTE ITS CONTENTS, OR TO MANUFACTURE,
 *  USE, OR SELL ANYTHING THAT IT MAY DESCRIBE, IN WHOLE OR IN PART.
 *
 * -----------------------------------------------------------------------------
 *   JS:  gdoc_GenAssets                                                                           
 *        Version     : V1.0
 *        Date        : 02th Nov 2021
 *        Description : It generates elements and components of fixed assets.
 *   
 *        CALLED FROM:
 *        ==============   
 *                                                 
 *        mObjAssetSrc
 *        ============
 *            @param        {string}         tipo_proceso         [AF]Activo fijo/[OC]Obras en curso
 *            @param        {string}         empcode              Empcode
 *            @param        {string}         tipdoc               Document type
 *            @param        {string}         delega               Local office
 *            @param        {string}         depart               Department
 *            @param        {date}           fecha                Date
 *            @param        {string}         tercer               Business partner
 *            @param        {string}         tipdir               Address
 *            @param        {string}         terenv               Delivery business partner
 *            @param        {string}         direnv               Delivery address
 *            @param        {string}         docser               Document number
 *            @param        {string}         refter               Reference document
 *            @param        {bigdec}         dtogen               General discount                   
 *            @param        {string}         codpre               Budget code
 *            @param        {string}         codpar               Budget item
 *            @param        {string}         divisa               Currency
 *            @param        {bigdec}         cambio               Exchange rate
 *            @param        {string}         gdeparta_proyec      Department proyect
 *            @param        {string}         gdeparta_seccio      Department section
 *            @param        {string}         gdeparta_ctaexp      Department cost account
 *            @param        {string}         gdeparta_centro      Department cost center
 *                                           
 *            @param        {string}         docid                Line identifier
 *            @param        {string}         codart               Item
 *            @param        {string}         varlog               Logistic variable
 *            @param        {bigdec}         canmov               Quantity
 *            @param        {bigdec}         impnet               Net amount
 *            @param        {string}         desvar               Line description                                
 *            @param        {string}         exist_datc           Exist accounting data
 *            @param        {string}         gartfami_codinm      Asset code
 *            @param        {string}         gartfami_serele      Serial of asset item
 *            @param        {string}         gartfami_agrele      Group asset items         
 *            @param        {string}         gartfami_codcta      Asset account type
 *            @param        {string}         gartfami_codgru      Asset group code
 *            @param        {string}         gartfami_codfis      Asset fiscal code
 *            @param        {string}         gartfami_sisamo      Amortization system        
 **/                                                                                            

function gdoc_GenAssets(pStrTabname, pStrTabline, pIntCabid, pArrAssetSrc) {
    
    /**
     * LOCAL FUNCTION: __getAreaDestino
     * 
     * Función local que obtienes el área destino de la solicitud     
     * 
     *      @param   {integer}   pIntCabid       Id. de la factura    
     */ 
    function __getAreaDestino(pIntCabid) {
        
        var mStrDepartSol = Ax.db.executeGet (`
            <select>
                <columns>
                    FIRST 1
                    NVL(gcomsoll.auxchr2, gcomsolh.depart) depart_sol
                </columns>
                <from table='gcomsoll'>
                    <join table='gcomsolh'>
                        <on>gcomsoll.cabid = gcomsolh.cabid</on>
                        <join table='gcomsold'>
                            <on>gcomsolh.tipdoc = gcomsold.codigo</on>
                        </join>
                    </join>
                    <join table='gcompedl_lnk'>
                        <on>gcompedl_lnk.lnk_cabori  = gcomsoll.cabid</on>
                        <on>gcompedl_lnk.lnk_linori  = gcomsoll.linid</on>
                        <join table='gcompedl'>
                            <on>gcompedl_lnk.lnk_tabori = 'gcomsolh'</on>
                            <on>gcompedl_lnk.linid   = gcompedl.linid</on>
                            <join table='gcompedh'>
                                <on>gcompedl.cabid = gcompedh.cabid</on>
                                <join table='gcomalbl'>
                                    <on>gcomalbl.cabori = gcompedl.cabid</on>
                                    <on>gcomalbl.tabori = 'gcompedh'</on>
                                        <join table='gcomalbh'>
                                        <on>gcomalbl.cabid = gcomalbh.cabid</on>
                                        <join table='gcomfacl'>
                                            <on>gcomalbl.cabid = gcomfacl.cabori</on>
                                            <on>gcomfacl.tabori = 'gcommovh'</on>
                                        </join>
                                    </join>
                                </join>
                            </join>
                        </join>
                    </join>
                </from>
                <where>
                        gcomsold.circui = 'LOG'
                    AND gcomsolh.estcab = 'V'
                    AND gcomfacl.cabid  = ?
                </where>
            </select>
        `, pIntCabid);

        var mStrSeccion = Ax.db.executeGet(`
            SELECT gdeparta.seccio
              FROM gdeparta
             WHERE gdeparta.depart = ?
        `, mStrDepartSol);     
        
        return mStrSeccion;
    }
    
    var mStrTabdatc     = pStrTabline + "_datc";
    var mObjAddonsData  = {};
    var mStrAreaDestino = '';
    var mStrElemDif     = '';
    var mSqlcond        = '';
    
    /**
     * Structure with the information required to generate the fixed assets.
     **/
    var mObjCinmdata = {
        empcode  : null,                                         // Company
        codinm   : null,                                         // Property
        serele   : null,                                         // Element/series code
        nomele   : null,                                         // Element/component name.
        elem_dif : null,                                         // Crea elemento S/N
                                                                                                 
        codcta   : null,                                         // Accounting group
        proyec   : null,                                         // Project
        seccio   : null,                                         // Section
        ctaexp   : null,                                         // Operating account
        centro   : null,                                         // Center  

        codgru   : null,                                         // Fiscal group
        codfis   : null,                                         // Fiscal Code
        
        sisamo   : null,                                         // Amortization system
        codpre   : null,                                         // Budget
        codpar   : null,                                         // Partida

        fecha    : null,                                         // Registration date
        fecdoc   : null,                                         // Delivery note or invoice date
        fecini   : null,                                         // Amortization start date
        jusser   : null,                                         // Voucher
        docser   : null,                                         // Document
        refter   : null,                                         // Reference
        tercer   : null,                                         // Third company
        unidad   : null,                                         // Unit
        valinv   : null,                                         // Inventory value

        tabname  : null,
        docid    : null,
        divisa   : null,                                         // Currency invoice
        cambio   : null,                                         // Money exchange
        impfac   : null                                          // Invoice amount
    }
    
    mStrAreaDestino = __getAreaDestino(pIntCabid);
    
    /**
     * Process rs with source data required to generate the fixed assets.
     **/
    for  (var mObjAssetSrc of pArrAssetSrc) {
        console.log('OBJETO');
        console.log(mObjAssetSrc);
        
	   /**
		 * Start of amortization by default on the same date as the document.
		 **/
		var mDateFecini = mObjAssetSrc.fecha;
        /**
         * First, delete previous assets components.
         **/
        Ax.db.executeProcedure("iges_cinmcomp_delete",
            pStrTabline,
            mObjAssetSrc.docid
        );
		/**
		 * Insert accounting data. Ensures exists one row
		 **/
		if (mObjAssetSrc.exist_datc) {

			var mRsGdatconl = Ax.db.executeQuery(`
				SELECT proyec, seccio, ctaexp,
					   centro, codpre, codpar, 
					   porcen, import
				  FROM ${mStrTabdatc}
				 WHERE linid = ?
			`, mObjAssetSrc.docid).toMemory();
		} else {
			/**
			 * Resultset with accounting data.
			 **/
			var mRsGdatconl = new Ax.rs.Reader().memory( options => {
				options.setColumnNames([
					"proyec", "seccio", "ctaexp", "centro", "codpre", "codpar", "porcen", "import"
				]);
				options.setColumnTypes([
					Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.CHAR,   Ax.sql.Types.CHAR,
					Ax.sql.Types.CHAR, Ax.sql.Types.CHAR, Ax.sql.Types.DOUBLE, Ax.sql.Types.DOUBLE,                  
				]);
			});
			mRsGdatconl.rows().add(
				{
					proyec  : null,
					seccio  : null,
					ctaexp  : null,                                                 
					centro  : null,
					codpre  : null,
					codpar  : null,
					porcen  : null,
					import  : null
				}
			);      
		}
	 
		/**
		 * User include
		 * <include code='iges_inm_genera' name='before' />
		 **/                                 
	
		/**
		 * Process supply lines/invoice.                                           
		 **/
		var mIntUnidadAcu = 0;
		var mBcValinvAcu  = 0;  
		var mBcTotinv     = Ax.math.bc.mul(mObjAssetSrc.impnet,
			 Ax.math.bc.add(1, Ax.math.bc.div(mObjAssetSrc.dtogen, 100)));

		for (var mRowGdatconl of mRsGdatconl) {
		    
		    if(mObjAssetSrc.tipo_proceso == 'OC'){
		        
		        var mObjCinmelem = Ax.db.executeQuery(`
                    SELECT  cinmelem.codinm,
                            cinmelem.codele
                      FROM  cinmelem
                     WHERE  cinmelem.codpre  = ?
                       AND  cinmelem.codpar  = ?
                       AND  cinmelem.empcode = ?
                `, mRowGdatconl.codpre, mRowGdatconl.codpar, mObjAssetSrc.empcode).toOne();
                
                if(mObjCinmelem.codinm == null){
                    var mObjCinmelem = Ax.db.executeQuery(`
                        SELECT  cinmelem.codinm,
                                cinmelem.codele
                          FROM  cinmelem
                         WHERE  cinmelem.codpre  = ?
                           AND  cinmelem.codpar  = ?
                           AND  cinmelem.empcode = ?
                    `, mObjAssetSrc.codpre, mObjAssetSrc.codpar, mObjAssetSrc.empcode).toOne();
                }
		    }
        
			var mStrProyec = mRowGdatconl.proyec || mObjAssetSrc.gdeparta_proyec;
			var mStrSeccio = mRowGdatconl.seccio || mStrAreaDestino || mObjAssetSrc.gdeparta_seccio;
			var mStrCtaexp = mRowGdatconl.ctaexp || mObjAssetSrc.gdeparta_ctaexp;
			var mStrCentro = mRowGdatconl.centro || mObjAssetSrc.gdeparta_Centro;
			
			var mStrCodpre = mRowGdatconl.codpre || mObjAssetSrc.codpre;
			var mStrCodpar = mRowGdatconl.codpar || mObjAssetSrc.codpar;
	
			var mBcPorcen  = mRowGdatconl.porcen || 100;
	
			/**
			 * Get number of units and inventory value per component.
			 * In case there is distribution of projects, sections, take it into account.
			 **/
			 
			if (mRsGdatconl.getRow() == mRsGdatconl.getRowCount()) {
			    
			    /**
			     * Round down to the nearest integer
			     */
				var mIntUnidad = Ax.math.bc.sub(mObjAssetSrc.canmov, mIntUnidadAcu).setScale(0, Ax.math.bc.RoundingMode.DOWN);
				var mBcValinv  = Ax.math.bc.sub(mBcTotinv, mBcValinvAcu)
				
			} else {
			    
				/**
				 * Round(mObjAssetSrc.canmov * (mRowGdatconl.porcen / 100))
				 * Round up to the nearest integer
				 **/
				var mIntUnidad = Ax.math.bc.mul(mObjAssetSrc.canmov, Ax.math.bc.div(mBcPorcen, 100)).setScale(0, Ax.math.bc.RoundingMode.UP);
	
				/**                                                
				 * mRowGdatconl.import * ( 1 + (mObjAssetSrc.dtogen / 100))
				 **/
				var mBcValinv  = Ax.math.bc.mul(mRowGdatconl.import, Ax.math.bc.add(1, Ax.math.bc.div(mObjAssetSrc.dtogen, 100)))
			}
			
			
			/**
			 * Consider whether or not items are grouped.
			 **/
			if (mIntUnidad <= 0) {
				mIntUnidad = 1;
			}
	        
			if (mObjAssetSrc.gartfami_agrele != 0) {
			    /** FAMILIA DE ARTICULO AGRUPADO */
				var mIntNumele = 1;
			} else {
			    /** FAMILIA DE ARTICULO NO AGRUPADO */
				mBcValinv      = Ax.math.bc.div(mBcValinv, mIntUnidad);
				var mIntNumele = mIntUnidad;
				mIntUnidad     = 1;
			}
	        var mArrCinmelemFather = []
	        /**
	         * Consideracion si posee una linea padre asociada
	        */
	        if (mObjAssetSrc.linid_father == null) {
	            /** SIN LINEA PADRE */
	            
	            /**
	             * SETEO DE DATOS DEL ELEMENTO NUEVO A CREAR
	            */
	            
	            mStrElemDif = 'S';
	            mSqlcond    = `AND 1=1`;
	        } else {
	            /** CON LINEA PADRE */
	            
	            var mIntLinIdPadre = Ax.db.executeGet(`
                    <select>
                        <columns>
                            gcomfacl.auxnum2
                        </columns>
                        <from table='gcomfacl'/>
                        <where>
                            gcomfacl.linid = ?
                        </where>
                    </select>
                `, mObjAssetSrc.docid);
	            
	            /**
	             * OBTENER DATOS DEL ELEMENTO PADRE
	            */
	            mArrCinmelemFather = Ax.db.executeQuery(`
                    <select>
                        <columns>
                            cinmelem.seqno,
                            cinmelem.empcode,
                            cinmelem.codinm,
                            cinmelem.codele
                        </columns>
                        <from table='crp_related_fact_elemen'>
                            <join table='cinmelem'>
                                <on>crp_related_fact_elemen.cinmelem = cinmelem.seqno</on>
                            </join>
                        </from>
                        <where>
                            crp_related_fact_elemen.linid = ?
                        </where>
                    </select>
                `, mIntLinIdPadre).toJSONArray();
	            console.log('NUMERO-ELEMENTOS', mArrCinmelemFather.length);
	            mStrElemDif = 'N';
	            // mSqlcond    = `AND cinmelem.seqno = ${mArrCinmelemFather.seqno}`;
	        }
	        
			/**
			 * mIntUnidadAcu = mIntUnidadAcu + (mIntNumele * mIntUnidad)
			 * mBcValinvAcu  = mBcValinvAcu  + (mBcValinv  * mIntNumele)
			 **/
			mIntUnidadAcu = Ax.math.bc.add(mIntUnidadAcu, Ax.math.bc.mul(mIntNumele, mIntUnidad));
			mBcValinvAcu  = Ax.math.bc.add(mBcValinvAcu,  Ax.math.bc.mul(mBcValinv,  mIntNumele));
	        
			/**
			 * If the value is 0, no fixed assets are generated.
			 **/
			if (Ax.math.bc.isZero(mBcValinv)) {
				continue;
			}       
				  
			var mBcVatExpense = Ax.db.executeFunction("garticul_get_vat_expense",
				pStrTabname,
				pIntCabid,
				mObjAssetSrc.docid,
				mObjAssetSrc.tipdoc,
				null,                                               // zimemp
				null,                                               // zimter
				mObjAssetSrc.fecha,
				mObjAssetSrc.fecha,
				mObjAssetSrc.empcode,
				mObjAssetSrc.delega,
				mObjAssetSrc.depart,            
				mObjAssetSrc.tercer,
				mObjAssetSrc.terenv,
				mObjAssetSrc.direnv,
				mObjAssetSrc.tipdir,
				mObjAssetSrc.dockey,         
				mObjAssetSrc.codart,
				mBcValinv
			).toValue();
	        
			mBcValinv = Ax.math.bc.add(mBcValinv, mBcVatExpense);
	        
			/**
			 * Generate elements / components.
			 **/
			var mIntNumElemPadre = mArrCinmelemFather.length == 0 ? 1 : mArrCinmelemFather.length;
			for (let j = 0; j < mIntNumElemPadre; j++) {
			    if(mObjAssetSrc.linid_father != null) {
			        console.log('ELEMENTO - PADRE', mArrCinmelemFather[j]);
			        mSqlcond    = `AND cinmelem.seqno = ${mArrCinmelemFather[j].seqno}`;
			    }
			    
			    for (let i = 1; i <= mIntNumele; i++) {
			    
    			    var mObjElemenFather = Ax.db.executeQuery(` 
                        <select first='1'>
                            <columns>
                                cinmelem.empcode,
                                cinmelem.codinm,
                                cinmelem.codele
                            </columns>
                            <from table='crp_related_fact_elemen'>
                                <join table='cinmelem'>
                                    <on>crp_related_fact_elemen.cinmelem = cinmelem.seqno</on>
                                </join>
                            </from>
                            <where>
                                crp_related_fact_elemen.linid = ?
                            </where>
                        </select>
                    `, mObjAssetSrc.linid_father).toOne();
                    
    			    var codinm_AF = mObjAssetSrc.linid_father != null ? mArrCinmelemFather[j].codinm : mObjAssetSrc.gartfami_codinm;
    			    
    			    /**
    			     * Determina el código del bien según posea línea padre
    			    */
    			    var mStrCodinm = mObjAssetSrc.tipo_proceso == 'OC' ? mObjCinmelem.codinm : codinm_AF;
    			    
    				/**
    				 * User include
    				 * <include code='iges_inm_genera' name='before_s_cinmdata' />
    				 **/
    				mObjCinmdata.empcode  = mObjAssetSrc.linid_father != null ? mArrCinmelemFather[j].empcode : mObjAssetSrc.empcode;           // empcode
    				mObjCinmdata.codinm   = mStrCodinm                      // codinm
    				mObjCinmdata.serele   = mObjAssetSrc.linid_father != null ? mArrCinmelemFather[j].codele : mObjAssetSrc.gartfami_serele;   // codele
    				mObjCinmdata.nomele   = mObjAssetSrc.desvar;            // nomele
    				mObjCinmdata.tipcom   = 'I';                            //tipcom
    				mObjCinmdata.elem_dif = mStrElemDif;                    // nuevo elemento
    	 
    				mObjCinmdata.codcta  = mObjAssetSrc.gartfami_codcta;// codcta
    				mObjCinmdata.proyec  = mStrProyec;                  // proyec
    				mObjCinmdata.seccio  = mStrSeccio;                  // seccio
    				mObjCinmdata.ctaexp  = mStrCtaexp;                  // ctaexp
    				mObjCinmdata.centro  = mStrCentro;                  // centro
    	 
    				mObjCinmdata.codgru  = mObjAssetSrc.gartfami_codgru;// codgru
    				mObjCinmdata.codfis  = mObjAssetSrc.gartfami_codfis;// codfis
    					
    				mObjCinmdata.sisamo  = mObjAssetSrc.gartfami_sisamo;// sisamo
    				mObjCinmdata.codpre  = mStrCodpre;                  // codpre
    				mObjCinmdata.codpar  = mStrCodpar;                  // codpar
    	 
    				mObjCinmdata.fecha   = mObjAssetSrc.fecha;          // fecha
    				mObjCinmdata.fecdoc  = mObjAssetSrc.fecha;          // fecdoc
    				mObjCinmdata.fecini  = mDateFecini;                 // fecini
    				mObjCinmdata.jusser  = mObjAssetSrc.docser;         // jusser
    				mObjCinmdata.docser  = mObjAssetSrc.docser;         // docser
    				mObjCinmdata.refter  = mObjAssetSrc.refter;         // refter
    				mObjCinmdata.tercer  = mObjAssetSrc.tercer;         // tercer
    				mObjCinmdata.unidad  = mIntUnidad;                  // unidad
    				mObjCinmdata.valinv  = Ax.math.bc.mul(mBcValinv, mObjAssetSrc.cambio);                   // valinv
    				mObjCinmdata.impfac  = Ax.math.bc.mul(mBcValinv, mObjAssetSrc.cambio);                   // impfac
    				mObjCinmdata.divisa  = mObjAssetSrc.divisa;         // divisa
    	 	        mObjCinmdata.cambio  = mObjAssetSrc.cambio;         // cambio
    	 	
    				mObjCinmdata.tabname = pStrTabline;                 // tabname
    				mObjCinmdata.docid   = mObjAssetSrc.docid;          // docid
    				
    				
    				/**
            		 * Indicador si es llamapor por :
            		 * [AF] Circuito de activo fijo
            		 * [OC] Circuito de obras en curso
            		 **/
                    mObjAddonsData.tipo_proceso = mObjAssetSrc.tipo_proceso;
                    mObjAddonsData.sql_cond     = mSqlcond;
    	            
    				var mIntSerialCinmcomp = Ax.db.call('crp_cinmelemGenera', mObjCinmdata, mObjAddonsData);
    				
    				/**
    				 * Si componente creado correctamente
    				*/
    				if (mIntSerialCinmcomp > 0 && mIntSerialCinmcomp != null) {
    				    
    				    /**
    				     * Identificador del elemento asociado al componente creado
    				    */
    				    var mIntElemId = Ax.db.executeGet(`SELECT auxnum4 FROM cinmcomp WHERE seqno = ${mIntSerialCinmcomp}`);
    				    
    				    Ax.db.insert("crp_related_fact_elemen", 
                            { 
                                linid    : mObjAssetSrc.docid,
                                cinmelem : mIntElemId,
                                cinmcomp : mIntSerialCinmcomp
                            }
                        );
    				    
    				}
    			}
			}
			 
			
		}
    }

    /**
     * User include
     * <include code='iges_inm_genera' name='after' />
     **/
}
