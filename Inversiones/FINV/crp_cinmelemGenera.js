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
 * "Confidentiality and Non-disclosure" agreements explicitly covering such access.
 *  The copyright notice above does not evidence any actual or intended publication 
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
 *  -----------------------------------------------------------------------------
 *  JS: crp_cinmelemGenera
 *      Version     : V1.7
 *      Date        : 2022.12.22
 * 
 *      Genera elemento y componente o asigna componente a elemento existente.                                 
 *                                                                        
 *      Se llama desde los objetos de gestión (Albaran, Factura) durante la  
 *      validación de documento o en el proceso de contabilización. 
 *      Depende del indicador en la tipología de documento.
 *
 *                                                                             
 *      METODOS DE INCORPORACIÓN DE ACTIVOS  
 * 
 *      [Inversion / Obra en curso / Partida pesupuestaria] 
 *      Si el documento origen tiene asignados Inversion y Partida presupuestaria.
 *      Si existe algun elemento de activos que tenga asignados ambos valores.
 *      Entonces los componentes a crear se asignan a dicho Elemento
 *              
 *      [Compra como re-inversion]
 *      Si el documento origen tiene valores para los que ya existe un Elemento 
 *      de activos (misma empresa y mismo bien) de igual numerador  (codele)
 *      Entonces los componentes a crear se asignan a dicho Elemento
 * 
 *      Si no existe elemento previo se crea elemento y componente
 *      Esto permite adicionar re-inversiones por nueva compra o por un
 *      mantenimiento que alarga la vida util
 * 
 *      [Compra como inversion / activo fijo]
 * 
 *      No existe elemento previo y se crea elemento y componente
 * 
 * 
 *      DESGLOSE DE LAS FICHAS DE ACTIVO
 * 
 *      Atendiendo al campo [gartfami.agrele] para cada linea del documento 
 *      
 *      1. Se crea 1 Elemento y 1 componente por cada unidad            [garfami.agrele = 0]
 *      2. Se crea 1 Elemento y 1 componente por todas las unidades     [garfami.agrele = 1]
 *      3. Se crea componente y lo asocia a un elemento en específico  
 * 
 *      CALLED FROM:
 *      ============
 *      [Obras en curso]
 *     	Contabilizar        : [JS]     iges_con_contab_set_cinmcomp
 *      Botón en gcomfacl   : [Action] BUT_CINMCOMP
 * 
 *      [Activos Fijos]
 *      Contabilizar        : [JS]      gdoc_GenAssets
 * 
 *      LOCAL FUNCTIONS:
 *      ================
 *      __cinmelemGenera        This records the Asset and the Asset values info.
 *      __cincompGenera         This records thee Asset Component(s) info  and its 
 *                              related Component value.
 *      __relacionaElemComp     Relaciona tabla de equipos y máquinas con elementos
 *                              y componentes.
 *          
 *      PARAMETERS:
 *      ===========
 *      @param      {object}    pObjAssetData        Object information
 *                                                   String      empcode        Company
 *                                                   String      codinm         Property
 *                                                   String      serele         Element / Serializer code
 *                                                   String      nomele         Element / Asset name
 *                                                   String      codcta         Accounting group
 *                                                   String      proyec         Project
 *                                                   String      seccio         Section
 *                                                   String      ctaexp         Operating account
 *                                                   String      centro         Center
 *                                                   String      codgru         Tax group
 *                                                   String      codfis         Tax fiscal code
 *                                                   String      tipcom         Type of component (Investment)
 *                                                   String      sisamo         Amortization system
 *                                                   String      codpre         Budget / Investment code
 *                                                   String      codpar         Item /  Investment chapter.
 *                                                   Date        fecha          Registration date
 *                                                   Date        fecdoc         Delivery date or invoice
 *                                                   Date        fecini         Amortization start date
 *                                                   String      jusser         Voucher
 *                                                   String      docser         Document
 *                                                   String      refter         Business partner document
 *                                                   String      tercer         Third company
 *                                                   Integer     unidad         Units
 *                                                   Decimal     valinv         Inventory value
 *                                                   String      tabname        Source table
 *                                                   Integer     docid          Source identifier
 *                                                   String      divisa         Currency
 *                                                   Decimal     cambio         Exchange rate
 *                                                   Decimal     impfac         Invoice amount
 *                                                   String      elem_dif       S/N
 *                                                   String      tipo_proceso   [OC]Obra en curso, [AF]Activo Fijo.
 * 
 *      @param      {object}     pObjAddonsData     Object information
 *                                                  String       accion         Indica de donde se realiza el llamado [BUTTON_CINMCOMP/PROCESS_CONTAB].
 *                                                  String       tipo_proceso   [OC]Obra en curso, [AF]Activo Fijo.
 *                                                  Integer      cparpreLinid   Identificador de Ingresos y Gastos (cpar_premovi)  
 */
function crp_cinmelemGenera(pObjAssetData, pObjAddonsData) {

    /**
     * LOCAL FUNCTION: __cinmelemGenera
     * 
     * Research of any pre-existing asset definition (with or withou Budget / 
     * Investment connection)
     * If not exists, the Asset is recorded as new Element / Item
     **/
    function __cinmelemGenera(pObjAssetData, pObjCinmhead, pStrTipoProceso, pStrSqlcond) {
    
        var mObjCinmelemCreate = 1;
        var mSqlcond = pStrSqlcond;
        
        if(mSqlcond == null){
            mSqlcond = `AND 1=1`;
        }
        
        /**
         * Si se ha recuperado valor para Presupuesto / Inversion  y su Partida
         * entonces se verifica si ya existe un Elemento asignado.
         * Se recuperan valores del más actual.
         **/
        if (pObjAssetData.codpre) {
            var mObjCinmelem = Ax.db.executeQuery(`
                <select first='1'>
                    <columns>
                        cinmelem.empcode, cinmelem.codinm, cinmelem.codele,
                        cinmelem.codcta,  cinmelem.codgru, cinmelem.codfis,
                        cinmelem.proyec,  cinmelem.seccio, cinmelem.nomele,
                        cinmelem.ctaexp,  cinmelem.centro, 
                        cinmeval.sistem,  cinmeval.sisamo, cinmeval.porcen,
                        cinmeval.numeje
                    </columns>
                    <from table='cinmelem'>
                        <join type='left' table='cinmeval'>
                            <on>cinmeval.empcode = cinmelem.empcode</on>
                            <on>cinmeval.codinm  = cinmelem.codinm</on>
                            <on>cinmeval.codele  = cinmelem.codele</on>
                            <on>cinmeval.sistem  = ?</on>
                        </join>
                    </from>
                    <where>
                            cinmelem.empcode = ?
                        AND cinmelem.codinm  = ?
                        AND cinmelem.codpre  = ?
                        AND cinmelem.codpar  = ?
                        ${mSqlcond}
                    </where>
                    <order>seqno DESC</order>
                </select>
            `, pObjCinmhead.sistem, 
               pObjAssetData.empcode, 
               pObjAssetData.codinm, 
               pObjAssetData.codpre, 
               pObjAssetData.codpar).toOne();
            
            /**
             * Caso: Línea de factura con línea padre o indenpendiente.
             * Se condiciona la creación de elemento según venga informado en el JS
             * iges_con_contab_set_cinmcomp. 
             **/
            switch(pStrTipoProceso){
                    
                case 'OC':
                        if (pObjAssetData.elem_dif == 'S') {
                            mObjCinmelemCreate = 1;
                        }
                        
                        if (pObjAssetData.elem_dif == 'N') {
                            mObjCinmelemCreate = 0;
                        }
                    break;
                
                default:
                    if (mObjCinmelem.codele) {
                        mObjCinmelemCreate = 0;
                    }
                    break;
            }
        }
        
        /**
        * Si no se ha encontrado o si no  hay valor para Presupuesto / Inversion  
        * y su Partida entonces se verifica si ya existe un Elemento para la
        * empresa, bien y codigo de elemento recibido.
        * Se recuperan valores si existe.
        **/     
        // Si no se ha encontrado elemento con inversion se busca elemento.
        if (mObjCinmelemCreate == 1) {
            var mObjCinmelem = Ax.db.executeQuery(`
                <select>
                    <columns>
                        cinmelem.empcode, cinmelem.codinm, cinmelem.codele,
                        cinmelem.codcta,  cinmelem.codgru, cinmelem.codfis,
                        cinmelem.proyec,  cinmelem.seccio, cinmelem.nomele,
                        cinmelem.ctaexp,  cinmelem.centro, 
                        cinmeval.sistem,  cinmeval.sisamo, cinmeval.porcen,
                        cinmeval.numeje                       
                    </columns>
                    <from table='cinmelem'>
                        <join type='left' table='cinmeval'>
                            <on>cinmeval.empcode = cinmelem.empcode</on>
                            <on>cinmeval.codinm  = cinmelem.codinm</on>
                            <on>cinmeval.codele  = cinmelem.codele</on>
                            <on>cinmeval.sistem  = ?</on>
                        </join>                    
                    </from>
                    <where>
                            cinmelem.empcode = ?
                        AND cinmelem.codinm  = ?
                        AND cinmelem.codele  = ?
                        ${mSqlcond}
                    </where>
                </select>
            `, pObjCinmhead.sistem, 
               pObjAssetData.empcode, 
               pObjAssetData.codinm, 
               pObjAssetData.serele).toOne();
                
            /**
             * Caso: Línea de factura con línea padre o indenpendiente.
             * Se condiciona la creación de elemento según venga informado en el JS
             * iges_con_contab_set_cinmcomp. 
             **/
            switch(pStrTipoProceso){
                    
                case 'OC':
                        if (pObjAssetData.elem_dif == 'S') {
                            mObjCinmelemCreate = 1;
                        }
                        
                        if (pObjAssetData.elem_dif == 'N') {
                            mObjCinmelemCreate = 0;
                        }
                    break;
                
                default:
                    if (mObjCinmelem.codele) {
                        mObjCinmelemCreate = 0;
                    }
                    break;
            }
            
        }
        
        /**
        * Error si se ha encontrado elemento sin registro en cinmeval
        **/
        if (mObjCinmelemCreate == 0 && mObjCinmelem.sistem == null) {
            throw new Ax.ext.Exception("CINMEVAL", `No se encuentra informado valor para el elemento [${pObjAssetData.codele}]`);
        }
        
        /**
        * Si no se encuentra Elemento pre-existente, se crea la ficha del activo
        * [cinmelem] y adicionalmente sus valores [cinmeval]
        * 
        * Algunos campos obligados se libran a sus valores por defecto y si el 
        * serializador no esta informado, entonces es adjudicado por el trigger
        * de insert.
        **/  
        if (mObjCinmelemCreate == 1) {
            var mObjCinmelem = {
                seqno        : 0,
                empcode      : pObjAssetData.empcode,
                codinm       : pObjAssetData.codinm,
                codele       : pStrTipoProceso == 'OC' ? null : pObjAssetData.codele,
                nomele       : pObjAssetData.nomele,
                codgrp       : pObjCinmhead.codgrp,
                codcta       : pObjCinmhead.codcta,
                proyec       : pObjAssetData.proyec,
                seccio       : pObjAssetData.seccio,
                ctaexp       : pObjAssetData.ctaexp,
                centro       : pObjAssetData.centro,
                codgru       : pObjCinmhead.codgru,
                codfis       : pObjCinmhead.codfis,
                codpre       : pObjAssetData.codpre,
                codpar       : pObjAssetData.codpar
            }

            mObjCinmelem.seqno  = Ax.db.insert("cinmelem", mObjCinmelem).getSerial();
            mObjCinmelem.codele = Ax.db.executeGet(`SELECT codele FROM cinmelem WHERE seqno = ?`, mObjCinmelem.seqno);
            mObjCinmelem.sistem = pObjCinmhead.sistem;
            mObjCinmelem.sisamo = pObjAssetData.sisamo || 'L';
            mObjCinmelem.porcen = pObjCinmhead.porcen;
            mObjCinmelem.numeje = pObjCinmhead.numeje;
               
            Ax.db.insert("cinmeval", mObjCinmelem);
        }        
        
        return mObjCinmelem;
    }

    /**
     * LOCAL FUNCTION: __cimcompGenera
     * 
     * This routine creates the Asset component [cinmcomp / cinmcval] according 
     * to the  received parameters and the data of the paren Asset / Element 
     * [cinmelem / cinmeval]
     * 
     * @param       {obj}           pObjAssetData		Object with the source data.
     * @param       {obj}           pObjCinmelem		Object with the element and element value data.
     * @param       {obj}           pObjAddonsData		Aditional information to create a componente.
     **/
    function __cinmcompGenera(pObjAssetData, pObjCinmelem, pObjAddonsData) {
        
        /**
         * Consideraciones
         * 1. Fecha de registro es la fecha de creación del componente.
         * 2.Cuando se trata de una inversión de tipo "Inicial", "Auxiliar" o "Mejora" la fecha de inicio de depreciación
         *   debe ser el primer día del mes siguiente, según la fecha de registro.
         **/
        var mDateToday        = new Ax.util.Date();
        var mDateFeciniDeprec = '';
        var mDateFecDeprec =  new Ax.util.Date(pObjAssetData.fecha);
        
        if(['I', 'A', 'M'].includes(pObjAssetData.tipcom)){
            
            var mDateMonth           = mDateFecDeprec.getMonth() +1;
                mDateFeciniDeprec    = new Date(mDateFecDeprec.getFullYear(), mDateMonth, 1);
                pObjAssetData.fecini = mDateFeciniDeprec;
        }
        
        var mObjCinmcomp = {
            seqno        : 0,
            empcode      : pObjCinmelem.empcode,
            codinm       : pObjCinmelem.codinm,
            codele       : pObjCinmelem.codele,
            fecha        : pObjAssetData.fecha!= null ? pObjAssetData.fecha : mDateToday,
            fecini       : pObjAssetData.fecini,
            tercer       : pObjAssetData.tercer,
            numhis       : 0,
            nomcom       : pObjCinmelem.nomele,
            codcta       : pObjCinmelem.codcta,
            codgru       : pObjCinmelem.codgru,
            codfis       : pObjCinmelem.codfis,
            docser       : pObjAssetData.jusser || pObjAssetData.docser,
            numfac       : pObjAssetData.refter || pObjAssetData.jusser || pObjAssetData.docser,
            unidad       : pObjAssetData.unidad || 0,
            fecfac       : pObjAssetData.fecdoc,
            valhis       : 0,
            impven       : 0,
            auxnum1      : pObjAddonsData.cparpreLinid,
            auxnum4      : pObjCinmelem.seqno,           //Guardar el Id. del elmento creado
            tipcom       : pObjAssetData.tipcom,
            divisa       : pObjAssetData.divisa,
            cambio       : pObjAssetData.cambio,
            impfac       : pObjAssetData.impfac
            
        };

        mObjCinmcomp.seqno = Ax.db.insert("cinmcomp", mObjCinmcomp).getSerial();
        
        var mObjCinmcval = {
            empcode : pObjCinmelem.empcode,
            codinm  : pObjCinmelem.codinm,
            codele  : pObjCinmelem.codele,
            numhis  : 0,
            sistem  : pObjCinmelem.sistem,
            sisamo  : pObjCinmelem.sisamo,
            porcen  : pObjCinmelem.porcen,
            numeje  : pObjCinmelem.numeje,
            invcom  : Ax.math.bc.mul(pObjAssetData.valinv, pObjAssetData.cambio),
            netcom  : Ax.math.bc.mul(pObjAssetData.valinv, pObjAssetData.cambio)
        };

        mObjCinmcval.codcom = Ax.db.executeGet(`SELECT codcom FROM cinmcomp WHERE cinmcomp.seqno = ?`,  mObjCinmcomp.seqno);

        Ax.db.insert("cinmcval", mObjCinmcval);
        
        Ax.db.insert("cinmcomp_orig",
            {
                seqno  : mObjCinmcomp.seqno,
                tabori : pObjAssetData.tabname,
                docid  : pObjAssetData.docid
            }
        ); 
        
        return  mObjCinmcomp.seqno;
    }
    /**
     * LOCAL FUNCTION: __relacionaElemComp
     * 
     * Función local que relaciona tabla de equipos y máquinas con elementos y componentes.
     * @param       {obj}           pObjCinmelem		Objecto con información del elemento
     * @param       {integer}       pIntDocid		    Id. de la línea de la factura
     * @param       {integer}       pIntSeqno		    Id. del componente
     **/
    function __relacionaElemComp(pObjCinmelem, pIntDocid, pIntCinmcomp){

        /**
         * Obtenemos el linid del albarán 
         **/
        var mIntLinalb = Ax.db.executeGet(`
          SELECT gcomfacl.linori
            FROM gcomfacl
           WHERE gcomfacl.linid = ?
        `, pIntDocid);

        /**
         * Se valida que la línea del albarán este informado en cinmelem_ppe (ppe_auxnum2)
         **/
        var mIntExistAlbaran = Ax.db.executeGet(`
            SELECT COUNT(*)
              FROM cinmelem_ppe
             WHERE cinmelem_ppe.ppe_auxnum2 = ?
        `, mIntLinalb);

        if(mIntExistAlbaran > 1){
            mIntExistAlbaran = 1;
        }

        switch(mIntExistAlbaran){
            /**
             * De existir línea de albarán informado en cinmelem_ppe se procede
             * a enlazar elemento
             **/
            case 1:
                var mObjCinmPPE = Ax.db.executeQuery(`
                    SELECT FIRST 1 
                           cinmelem_ppe.ppe_equid,
                           cinmelem_ppe.ppe_codloc
                      FROM cinmelem_ppe
                     WHERE cinmelem_ppe.ppe_auxnum2 = ?
                       AND ppe_codinm IS NULL
                       AND ppe_codele IS NULL
                    ORDER BY ppe_equid ASC
                `, mIntLinalb).toOne();

                Ax.db.update("cinmelem_ppe",
                    {
                        ppe_codele       : pObjCinmelem.codele,
                        ppe_codinm       : pObjCinmelem.codinm,
                        ppe_seqno_compon : pIntCinmcomp
                
                    },
                    {
                        ppe_equid : mObjCinmPPE.ppe_equid
                    }
                );
                
                /** 
                 *  Guardar identificador de cinmelem_ppe (Equipos y máquinas) 
                 *  en el componente
                 **/
                Ax.db.update("cinmcomp", { auxnum2: mObjCinmPPE.ppe_equid }, { seqno: pIntCinmcomp });

                 /** 
                  * Guardar sublocalización informada en cinmelem_ppe (Equipos y máquinas) 
                  * en el elemento
                  **/
                var mStrLocpri = Ax.db.executeGet(`
                     SELECT codigo
                       FROM cinmlopr
                      WHERE cinmlopr.codigo IN (SELECT MAX(codpri) 
                                                  FROM cinmlosu 
                                                 WHERE cinmlosu.codigo = ?)
                `, mObjCinmPPE.ppe_codloc);

                Ax.db.update("cinmelem", 
                    { 
                        locsub: mObjCinmPPE.ppe_codloc,
                        locpri: mStrLocpri
                    }, 
                    { 
                        seqno : pObjCinmelem.seqno

                    }
                );
                break;

            /** 
             * Como no existe línea de albarán informado en cinmelem_ppe
             * se baja un nivel más y se busca a nivel de solicitud
             **/
             case 0 :
                /** 
                 * Se obtiene línea de la solicitud
                 **/
                var mIntLinsol = Ax.db.executeGet(`
                    SELECT gcompedl_lnk.lnk_linori
                      FROM gcompedl_lnk 
                     WHERE gcompedl_lnk.lnk_tabori = 'gcomsolh' 
                       AND gcompedl_lnk.linid IN (SELECT gcomalbl.linori 
                                                    FROM gcomalbl 
                                                   WHERE gcomalbl.linid = ?)
                `, mIntLinalb);

                if(mIntLinsol != null){

                    /** 
                     * Se valida que línea de la solicitud exista en cinmelem_ppe (ppe_auxnum1)
                     * y se procede a enlazar de lo contario no hace nada
                     **/
                    var mIntExistSolicitud = Ax.db.executeGet(`
                        SELECT COUNT(*)
                          FROM cinmelem_ppe
                         WHERE cinmelem_ppe.ppe_auxnum1 = ?
                    `, mIntLinsol);

                    if(mIntExistSolicitud > 0){

                        var mObjCinmPPE = Ax.db.executeQuery(`
                            SELECT FIRST 1 
                                    cinmelem_ppe.ppe_equid,
                                    cinmelem_ppe.ppe_codloc
                              FROM  cinmelem_ppe
                             WHERE  cinmelem_ppe.ppe_auxnum2 = ?
                               AND  ppe_codinm IS NULL
                               AND  ppe_codele IS NULL
                            ORDER BY ppe_equid ASC
                        `, mIntLinalb).toOne();

                        Ax.db.update("cinmelem_ppe",
                            {
                                ppe_codele       : pObjCinmelem.codele,
                                ppe_codinm       : pObjCinmelem.codinm,
                                ppe_seqno_compon : pIntCinmcomp
                        
                            },
                            {
                                ppe_equid : mObjCinmPPE.ppe_equid
                            }
                        );

                        /** 
                         *  Guardar identificador de cinmelem_ppe (Equipos y máquinas) 
                         *  en el componente
                         **/
                        Ax.db.update("cinmcomp", { auxnum2: mObjCinmPPE.ppe_equid }, { seqno: pIntCinmcomp });

                        /** 
                         * Guardar sublocalización informada en cinmelem_ppe (Equipos y máquinas) 
                         * en el elemento
                         **/
                        var mStrLocpri = Ax.db.executeGet(`
                            SELECT codigo
                              FROM cinmlopr
                             WHERE cinmlopr.codigo IN (SELECT MAX(codpri) 
                                                         FROM cinmlosu 
                                                        WHERE cinmlosu.codigo = ?)
                        `, mObjCinmPPE.ppe_codloc);

                        Ax.db.update("cinmelem", 
                            { 
                                locsub: mObjCinmPPE.ppe_codloc,
                                locpri: mStrLocpri
                            }, 
                            { 
                                seqno : pObjCinmelem.seqno

                            }
                        );
                    }
                }
        }
    }
             
    /**
     *      MAIN
     * 
     * Recuperación de los valores fiscales y de grupo de cuentas contables
     * a partir del Bien.
     **/
    var mObjCinmhead = Ax.db.executeQuery(`
        SELECT codgrp, codcta, codgru, codfis
          FROM cinmhead
         WHERE cinmhead.empcode = ?
           AND cinmhead.codinm  = ?
    `, pObjAssetData.empcode, pObjAssetData.codinm).toOne().setRequired(`Bien de inmovilizado: [${pObjAssetData.codinm}] no existente`);

    mObjCinmhead.codcta = pObjAssetData.codcta || mObjCinmhead.codcta;
    mObjCinmhead.codgru = pObjAssetData.codgru || mObjCinmhead.codgru;
    mObjCinmhead.codfis = pObjAssetData.codfis || mObjCinmhead.codfis;

    /**
     * El calculo del numero de ejercicios  de amortización tiene en cuenta 
     * el escenario de Activos que no amortizan (cinmftab.porcen = 0)
     **/
    var mObjCinmftab = Ax.db.executeQuery(`
        SELECT porcen,
               CASE WHEN porcen != 0 
                    THEN ROUND((100 / porcen) + 0.4999, 0)
                ELSE
                    0
                END numeje
          FROM cinmftab
         WHERE cinmftab.codgrp = ?
           AND cinmftab.codigo = ?
    `, mObjCinmhead.codgru, mObjCinmhead.codfis).toOne();

    if (mObjCinmftab.porcen == null) {
        throw new Ax.ext.Exception("GRUPO_2",
            `cinmelem_genera: Falta registro en 'cinmftab' para grupo:[${mObjCinmhead.codgru}] y código:[${mObjCinmhead.codfis}].`);
    }

    /**
     * Determinacion del sistema de amortización a partir de los datos por defecto
     * del perfil de usuario
     **/
    var mObjCdefcontDefaults = Ax.db.executeProcedure("cdefcont_defaults",
        Ax.ext.user.getCode(),
        'cinmhead',
        0               
    ).toOne();

    mObjCinmhead.sistem = mObjCdefcontDefaults.m_cdefcont_sistem;
    mObjCinmhead.porcen = mObjCinmftab.porcen;
    mObjCinmhead.numeje = mObjCinmftab.numeje;
            
    if (!mObjCinmhead.sistem) {
        throw new Ax.ext.Exception("SISTEMA",`Sistema no informado en cdefcont.`);
    }

    /**
     * Research or create the new Asset 
     **/
    var mObjCinmelem = __cinmelemGenera(pObjAssetData, mObjCinmhead, pObjAddonsData.tipo_proceso, pObjAddonsData.sql_cond);
    
    /**
     * Create the asset component.
     **/
    var mIntCinmcomp = __cinmcompGenera(pObjAssetData, mObjCinmelem, pObjAddonsData);

    /**
     * Relaciona equipos y máquinas con elementos y componentes 
     * (Sólo aplica al circuito de [AF]activos fijos)
     **/

    if (pObjAddonsData.tipo_proceso == 'AF'){
        __relacionaElemComp(mObjCinmelem, pObjAssetData.docid, mIntCinmcomp);
    }
    
    return mIntCinmcomp;
}
