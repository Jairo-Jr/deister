/**
 * Cambio de posicion de la Actualizacion del deducible
 * 
 * de lineas [1086 - 1109]
 * 
 * movido a [1186 - 1214]
 * 
 */


function liquidacion_CalcularImportes(pIDLiquidacion, pAplicaDedu) {

	/**
	 * Función local que graba los valores calculados y acumulados de las lineas
	 * en los campos de la cabecera de la liquidación, diferenciando si es la
	 * liquidación a financiador o su excedente.
	 *
	 *		@param		pIDLiquidacion					Id.Cabecera liquidación
	 *		@param		mObjLiquidacionImportes			Objeto con los datos economicos de la liq.
	 *
	 */
	function __insertDatosEconomicos(pIDLiquidacion, mObjLiquidacionImportes) {

		let mIntExc = 0;
		
		// Query para obtener los acumulados por impuesto
		let mRsDatEconImp = Ax.db.executeQuery(`
			<select>
				<columns>
					liqt_excedente,
					liql_impuesto,
					imp_porcentaje,
					imp_porcentaje / 100													<alias name='impuesto_calc'			/>,

					ROUND(SUM(liql_precio_fac * liql_cantidad),6)							<alias name='importe_bruto'			/>,
					ROUND(SUM((liql_precio_fac * liql_cantidad)-liql_importe_neto),6)		<alias name='importe_descto'		/>,
					ROUND(SUM(liql_importe_neto),6)											<alias name='importe_neto'			/>,
					ROUND(SUM(liql_impuesto_val),6)											<alias name='impuesto_val'			/>,
					ROUND(SUM(liql_importe_total),6)										<alias name='importe_total'			/>,
					ROUND(SUM(liql_importe_fac),6)											<alias name='importe_fac'			/>,
					ROUND(SUM(liql_factor_coa),6)											<alias name='factor_coa'			/>,
					ROUND(SUM(<nvl>liql_importe_neto_coa,0</nvl>),6)						<alias name='importe_neto_coa'		/>,
					ROUND(SUM(<nvl>liql_impuesto_coa,0</nvl>),6)							<alias name='impuesto_coa'			/>,
					ROUND(SUM(<nvl>liql_importe_total_coa,0</nvl>),6)						<alias name='importe_total_coa'		/>,

					<!-- ======= Coaseguro que ha pagado el paciente. No considerar no cubierto en coaseguro. ======= -->
					ROUND(SUM(CASE WHEN liql_cubierto = 0
								THEN 0
								ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
											THEN liql_importe_neto_difd - <nvl>liql_importe_neto_coa,0</nvl>
											ELSE liql_importe_neto - <nvl>liql_importe_dif_cuarto,0</nvl> - <nvl>liql_importe_neto_coa,0</nvl>
										END
							END ),6)														<alias name='importe_neto_coa_pp'  />,
					ROUND(SUM(CASE WHEN liql_cubierto = 0
								THEN 0
								ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
											THEN ROUND((liql_importe_neto_difd * (imp_porcentaje / 100)),6) - <nvl>liql_impuesto_coa,0</nvl>
											ELSE liql_impuesto_val - ROUND((<nvl>liql_importe_dif_cuarto,0</nvl> * (imp_porcentaje / 100)),6) - <nvl>liql_impuesto_coa,0</nvl>
										END
							END ),6)														<alias name='impuesto_coa_pp'		/>,
					ROUND(SUM(CASE WHEN liql_cubierto = 0
								THEN 0
								ELSE CASE WHEN liql_importe_neto_difd IS NOT NULL
											THEN ((liql_importe_neto_difd + ROUND((liql_importe_neto_difd * (imp_porcentaje / 100)),6)) - <nvl>liql_importe_neto_coa,0</nvl>)- <nvl>liql_importe_total_coa,0</nvl>
											ELSE liql_importe_total - <nvl>liql_importe_total_coa,0</nvl>
										END
							END ),6)														<alias name='importe_total_coa_pp'	/>,
					<!-- ======= Importe de productos [farmacia] ======= -->
					ROUND(SUM(CASE WHEN liql_concep_fact IN ('9','10','RF','CT')
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_far'			/>,
					<!-- ======= Importe excluido de la receta de farmacia. [Pago paciente Emergencia] ======= -->
					ROUND(SUM(CASE WHEN liql_concep_fact IN ('9','RF') AND liqt_excedente = 1 AND fas_liquidacion.liq_ambito = 'U'
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_far_exc'		/>,
					<!-- ======= Importe de todo lo reference a tipo concepto facturable "CLINICA" ======= -->
					ROUND(SUM(CASE WHEN cfa_tipo_concepto = '1'
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_cli'			/>,
					<!-- ======= Importe de todo lo reference a tipo concepto facturable "SERVICIOS AUXILIARES" ======= -->
					ROUND(SUM(CASE WHEN cfa_tipo_concepto = '2'
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_ser'			/>,
					<!-- ======= Importe de todo lo reference a tipo concepto facturable "HONORARIOS MÉDICOS" ======= -->
					ROUND(SUM(CASE WHEN cfa_tipo_concepto = '3'
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_hon'			/>,
					<!-- ======= Importe de todo lo reference a concepto facturable por "USO DE EQUIPOS MÉDICOS" ======= -->
					ROUND(SUM(CASE WHEN fas_hono_equipo.eqh_codigo IS NOT NULL
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_equi'			/>,
					<!-- ======= Importe consumos no cubiertos ======= -->
					ROUND(SUM(CASE WHEN liql_cubierto = 0
							THEN liql_importe_neto
							ELSE 0
						END),6)																<alias name='importe_nocubi'		/>,
				<!-- ======= Impuesto consumos no cubiertos ======= -->
					ROUND(SUM(CASE WHEN liql_cubierto = 0
								THEN liql_impuesto_val
								ELSE 0
							END),6)															<alias name='impuesto_nocubi'		/>,
					<!-- ======= Importe coaseguro excluido de la receta de farmacia. [Pago paciente Emergencia] ======= -->
					ROUND(SUM(CASE WHEN liql_concep_fact IN ('9','RF') AND liqt_excedente = 1 AND fas_liquidacion.liq_ambito = 'U'
								THEN liql_importe_neto_coa
								ELSE 0
							END),6)															<alias name='importe_coa_exc'		/>,
					<!-- ======= Impuesto de coaseguro excluido de la receta de farmacia. [Pago paciente Emergencia] ======= -->
					ROUND(SUM(CASE WHEN liql_concep_fact IN ('9','RF') AND liqt_excedente = 1 AND fas_liquidacion.liq_ambito = 'U'
								THEN liql_impuesto_coa
								ELSE 0
							END),6)															<alias name='impuesto_coa_exc'		/>,
					<!-- ======= Importe no cubierto excluido de la receta de farmacia. [Pago paciente Emergencia] ======= -->
					ROUND(SUM(CASE WHEN liql_concep_fact IN ('9','RF') AND liqt_excedente = 1 AND fas_liquidacion.liq_ambito = 'U'
								THEN CASE WHEN liql_cubierto = 0
											THEN liql_importe_neto
											ELSE 0
										END
								ELSE 0
							END),6)															<alias name='importe_nocubi_exc'	/>,
					<!-- ======= Impuesto de no cubierto excluido de la receta de farmacia. [Pago paciente Emergencia] ======= -->
					ROUND(SUM(CASE WHEN liql_concep_fact IN ('9','RF') AND liqt_excedente = 1 AND fas_liquidacion.liq_ambito = 'U'
								THEN CASE WHEN liql_cubierto = 0
											THEN liql_impuesto_val
											ELSE 0
										END
								ELSE 0
							END),6)															<alias name='impuesto_nocubi_exc'	/>,
					<!-- ======= Cálculos de hospitalario. Acumulando Diferencia de cuarto. ======= -->
					ROUND(SUM(CASE WHEN liql_cubierto = 0
								THEN 0
								ELSE <nvl>liql_importe_dif_cuarto,0</nvl>
							END),6)															<alias name='importe_dif_cuarto'	/>,
					ROUND(SUM(CASE WHEN liql_cubierto = 0
								THEN 0
								ELSE ROUND((<nvl>liql_importe_dif_cuarto,0</nvl> * (imp_porcentaje / 100)),6)
							END),6)															<alias name='impuesto_dif_cuarto'	/>
				</columns>
				<from table='fas_liquidacion_linea'>
					<join table='fas_liquidacion'>
						<on>fas_liquidacion_linea.liq_id = fas_liquidacion.liq_id</on>
						<join table='fas_liquidacion_tipo'>
							<on>fas_liquidacion.liq_tipo = fas_liquidacion_tipo.liqt_codigo</on>
						</join>
					</join>
					<join type='left' table='fas_prestacion'>
						<on>fas_liquidacion_linea.liql_presta_fact=fas_prestacion.pre_codigo</on>
					</join>
					<join type='left' table='fas_concepto_facturable'>
						<on>fas_liquidacion_linea.liql_concep_fact = fas_concepto_facturable.cfa_codigo</on>
						<join type='left' table='fas_concepto_facturable_tipo'>
							<on>fas_concepto_facturable.cfa_tipo_concepto = fas_concepto_facturable_tipo.cft_codigo</on>
						</join>
					</join>
					<join type='left' table='fas_hono_equipo'>
						<on>fas_liquidacion_linea.liql_concep_fact = fas_hono_equipo.eqh_cfa_codigo</on>
					</join>
					<join type='left' table='fas_impuesto'>
						<on>fas_liquidacion_linea.liql_impuesto = fas_impuesto.imp_codigo</on>
					</join>
				</from>
				<where>
						fas_liquidacion_linea.liq_id = ?
					AND fas_liquidacion_linea.liql_estado NOT IN ('R','N','Z','Q','X')
				</where>
				<group>1,2,3,4</group>
			</select>
		`, pIDLiquidacion);

		/*
		 * Recorrer el objeto con las lineas para acumular los calculos de
		 * datos económicos de la cabecera de liquidación
		 */
		for (let mRowDatEcoImp of mRsDatEconImp) {

			let mImporteNeto	= 0;
			let mImpuestoVal	= 0;
				mIntExc			= mRowDatEcoImp.liqt_excedente;

			if (mIntExc == 0) {
				/*
				 * Importe Neto [Subtotal- Deducible que paga el paciente - Diferencia de cuarto que paga el
				 * paciente - Coaseguro que paga el paciente - No cubiertos pagados por paciente]
				 */
				mImporteNeto = Ax.math.bc.sub(
					mRowDatEcoImp.importe_neto,
					mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_ded : 0,
					mRowDatEcoImp.importe_dif_cuarto,
					mRowDatEcoImp.importe_neto_coa_pp,
					mRowDatEcoImp.importe_nocubi
				);

				/*
				 * Monto impuesto [Impuesto de subtotal- Impuesto deducible que paga el paciente - Impuesto de
				 * diferencia de cuarto que paga el paciente - Impuesto de coaseguro que paga el paciente - Impuesto
				 * de no cubiertos pagados por paciente]
				 */
				mImpuestoVal = Ax.math.bc.sub(
					mRowDatEcoImp.impuesto_val,
					Ax.math.bc.mul(
						mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_ded : 0,
						mRowDatEcoImp.impuesto_calc
					),
					mRowDatEcoImp.impuesto_dif_cuarto,
					mRowDatEcoImp.impuesto_coa_pp,
					mRowDatEcoImp.impuesto_nocubi
				);

			} else {

				// Importe Neto [Coaseguro - Coaseguro Excluido + Deducible + Diferencia de cuarto + No cubiertos]
				mImporteNeto = Ax.math.bc.add(
					Ax.math.bc.sub(mRowDatEcoImp.importe_neto_coa, mRowDatEcoImp.importe_coa_exc),
					mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_ded : 0,
					mRowDatEcoImp.importe_dif_cuarto,
					Ax.math.bc.sub(mRowDatEcoImp.importe_nocubi, mRowDatEcoImp.importe_nocubi_exc)
				);

				// Monto impuesto [Impuesto de coaseguro - Impuesto excluido + Impuesto Deducible + Impuesto Diferencia de cuarto + Impuesto No cubiertos]
				mImpuestoVal = Ax.math.bc.add(
					Ax.math.bc.sub(mRowDatEcoImp.impuesto_coa, mRowDatEcoImp.impuesto_coa_exc),
					Ax.math.bc.mul(
						mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_ded : 0,
						mRowDatEcoImp.impuesto_calc
					),
					mRowDatEcoImp.impuesto_dif_cuarto,
					Ax.math.bc.sub(mRowDatEcoImp.impuesto_nocubi, mRowDatEcoImp.impuesto_nocubi_exc)
				);
			}

			// Redondeo de montos sobre la base imponible y cálculo del IGV sobre la base imponible redondeado
			mImporteNeto = mImporteNeto.setScale(2, Ax.math.bc.RoundingMode.HALF_UP)
			mImpuestoVal = Ax.math.bc.mul(mImporteNeto, mRowDatEcoImp.impuesto_calc).setScale(2, Ax.math.bc.RoundingMode.HALF_UP)

			// Importe Tot.: Total + Impuesto
			let mImporteTotal = Ax.math.bc.add(
				mImporteNeto,
				mImpuestoVal
			);

			/*
			 * Agrega los datos económicos a los registros de impuesto de la liquidación.
			 *
			 * Se inserta o modifica el registro en base a si ya hubo una primera liquidación y
			 * existe registro de impuesto.
			 */
			let mIdLiqImpuesto = Ax.db.executeGet(`
				<select>
					<columns>
						fas_liquidacion_impuesto.liqi_id
					</columns>
					<from table='fas_liquidacion_impuesto' />
					<where>
							fas_liquidacion_impuesto.liq_id = ?
						AND fas_liquidacion_impuesto.liqi_impuesto = ?
					</where>
				</select>
			`, pIDLiquidacion, mRowDatEcoImp.liql_impuesto);

			if (mIdLiqImpuesto) {
				Ax.db.update("fas_liquidacion_impuesto",
					{
						"imp_porcentaje"			: mRowDatEcoImp.imp_porcentaje,
						"liqi_importe_bruto"		: mRowDatEcoImp.importe_bruto,
						"liqi_importe_descto"		: mRowDatEcoImp.importe_descto,
						"liqi_importe_subtot"		: mRowDatEcoImp.importe_neto,
						"liqi_impuesto_subtot"		: mRowDatEcoImp.impuesto_val,
						"liqi_importe_far"			: mRowDatEcoImp.importe_far,
						"liqi_importe_far_exc"		: mRowDatEcoImp.importe_far_exc,
						"liqi_importe_cli"			: mRowDatEcoImp.importe_cli,
						"liqi_importe_ser"			: mRowDatEcoImp.importe_ser,
						"liqi_importe_hon"			: mRowDatEcoImp.importe_hon,
						"liqi_importe_equi"			: mRowDatEcoImp.importe_equi,
						"liqi_importe_ded"			: mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_ded : 0 ,
						"liqi_impuesto_ded"			: mRowDatEcoImp.liql_impuesto == "IGV" ? Ax.math.bc.mul(mObjLiquidacionImportes.liq_importe_ded, mRowDatEcoImp.impuesto_calc) : 0,
						"liqi_importe_consulta"		: mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_consulta : 0,
						"liqi_importe_dif_cuarto"	: mRowDatEcoImp.importe_dif_cuarto,
						"liqi_impuesto_dif_cuarto"	: mRowDatEcoImp.impuesto_dif_cuarto,
						"liqi_importe_coa"			: mRowDatEcoImp.importe_neto_coa,
						"liqi_impuesto_coa"			: mRowDatEcoImp.impuesto_coa,
						"liqi_importe_coa_exc"		: mRowDatEcoImp.importe_coa_exc,
						"liqi_impuesto_coa_exc"		: mRowDatEcoImp.impuesto_coa_exc,
						"liqi_importe_coa_pp"		: mRowDatEcoImp.importe_neto_coa_pp,
						"liqi_impuesto_coa_pp"		: mRowDatEcoImp.impuesto_coa_pp,
						"liqi_importe_nocubi"		: mRowDatEcoImp.importe_nocubi,
						"liqi_impuesto_nocubi"		: mRowDatEcoImp.impuesto_nocubi,
						"liqi_importe_nocubi_exc"	: mRowDatEcoImp.importe_nocubi_exc,
						"liqi_impuesto_nocubi_exc"	: mRowDatEcoImp.impuesto_nocubi_exc,
						"liqi_importe_neto"			: mImporteNeto,
						"liqi_impuesto_val"			: mImpuestoVal,
						"liqi_importe_total"		: mImporteTotal,
						"user_updated"				: Ax.ext.user.getCode(),
						"date_updated"				: new Ax.util.Date().setConnection(Ax.db)
					},
					{
						"liqi_id"					: mIdLiqImpuesto
					}
				);
			} else {
				Ax.db.insert("fas_liquidacion_impuesto",
					{
						"liqi_id"					: 0,
						"liq_id"					: pIDLiquidacion,
						"liqi_impuesto"				: mRowDatEcoImp.liql_impuesto,
						"imp_porcentaje"			: mRowDatEcoImp.imp_porcentaje,
						"liqi_importe_bruto"		: mRowDatEcoImp.importe_bruto,
						"liqi_importe_descto"		: mRowDatEcoImp.importe_descto,
						"liqi_importe_subtot"		: mRowDatEcoImp.importe_neto,
						"liqi_impuesto_subtot"		: mRowDatEcoImp.impuesto_val,
						"liqi_importe_far"			: mRowDatEcoImp.importe_far,
						"liqi_importe_far_exc"		: mRowDatEcoImp.importe_far_exc,
						"liqi_importe_cli"			: mRowDatEcoImp.importe_cli,
						"liqi_importe_ser"			: mRowDatEcoImp.importe_ser,
						"liqi_importe_hon"			: mRowDatEcoImp.importe_hon,
						"liqi_importe_equi"			: mRowDatEcoImp.importe_equi,
						"liqi_importe_ded"			: mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_ded : 0 ,
						"liqi_impuesto_ded"			: mRowDatEcoImp.liql_impuesto == "IGV" ? Ax.math.bc.mul(mObjLiquidacionImportes.liq_importe_ded, mRowDatEcoImp.impuesto_calc) : 0 ,
						"liqi_importe_consulta"		: mRowDatEcoImp.liql_impuesto == "IGV" ? mObjLiquidacionImportes.liq_importe_consulta : 0,
						"liqi_importe_dif_cuarto"	: mRowDatEcoImp.importe_dif_cuarto,
						"liqi_impuesto_dif_cuarto"	: mRowDatEcoImp.impuesto_dif_cuarto,
						"liqi_importe_coa"			: mRowDatEcoImp.importe_neto_coa,
						"liqi_impuesto_coa"			: mRowDatEcoImp.impuesto_coa,
						"liqi_importe_coa_exc"		: mRowDatEcoImp.importe_coa_exc,
						"liqi_impuesto_coa_exc"		: mRowDatEcoImp.impuesto_coa_exc,
						"liqi_importe_coa_pp"		: mRowDatEcoImp.importe_neto_coa_pp,
						"liqi_impuesto_coa_pp"		: mRowDatEcoImp.impuesto_coa_pp,
						"liqi_importe_nocubi"		: mRowDatEcoImp.importe_nocubi,
						"liqi_impuesto_nocubi"		: mRowDatEcoImp.impuesto_nocubi,
						"liqi_importe_nocubi_exc"	: mRowDatEcoImp.importe_nocubi_exc,
						"liqi_impuesto_nocubi_exc"	: mRowDatEcoImp.impuesto_nocubi_exc,
						"liqi_importe_neto"			: mImporteNeto,
						"liqi_impuesto_val"			: mImpuestoVal,
						"liqi_importe_total"		: mImporteTotal,
						"user_created"				: Ax.ext.user.getCode(),
						"date_created"				: new Ax.util.Date().setConnection(Ax.db),
						"user_updated"				: Ax.ext.user.getCode(),
						"date_updated"				: new Ax.util.Date().setConnection(Ax.db)
					});
			}
		}
		mRsDatEconImp.close()

		/**
		 * Existe la posibilidad de que se tuviera un monto de impuesto que cuando se
		 * re-liquida ya no participa dicho impuesto y por tanto se deben modificar
		 * los valores a cero para que se mantenga en las versiones.
		 */
		let mRsLiqImpNOT = Ax.db.executeQuery(`
			<select>
				<columns>
					fas_liquidacion_impuesto.liqi_id
				</columns>
				<from table='fas_liquidacion_impuesto' />
				<where>
						fas_liquidacion_impuesto.liq_id = ?
					AND NOT EXISTS (SELECT l.liql_id
								  FROM fas_liquidacion_linea l
								 WHERE l.liq_id = fas_liquidacion_impuesto.liq_id
								   AND l.liql_impuesto = fas_liquidacion_impuesto.liqi_impuesto)
				</where>
			</select>
		`, pIDLiquidacion);

		/*
		 * Recorrer el objeto con las lineas para acumular los calculos de
		 * datos económicos de la cabecera de liquidación
		 */
		for (let mRowLiqImpNot of mRsLiqImpNOT) {

			Ax.db.update("fas_liquidacion_impuesto",
				{
					"liqi_importe_bruto"		: 0,
					"liqi_importe_descto"		: 0,
					"liqi_importe_subtot"		: 0,
					"liqi_impuesto_subtot"		: 0,
					"liqi_importe_far"			: 0,
					"liqi_importe_far_exc"		: 0,
					"liqi_importe_cli"			: 0,
					"liqi_importe_ser"			: 0,
					"liqi_importe_hon"			: 0,
					"liqi_importe_equi"			: 0,
					"liqi_importe_ded"			: 0,
					"liqi_impuesto_ded"			: 0,
					"liqi_importe_dif_cuarto"	: 0,
					"liqi_impuesto_dif_cuarto"	: 0,
					"liqi_importe_consulta"		: 0,
					"liqi_importe_coa"			: 0,
					"liqi_impuesto_coa"			: 0,
					"liqi_importe_coa_exc"		: 0,
					"liqi_impuesto_coa_exc"		: 0,
					"liqi_importe_coa_pp"		: 0,
					"liqi_impuesto_coa_pp"		: 0,
					"liqi_importe_nocubi"		: 0,
					"liqi_impuesto_nocubi"		: 0,
					"liqi_importe_nocubi_exc"	: 0,
					"liqi_impuesto_nocubi_exc"	: 0,
					"liqi_importe_neto"			: 0,
					"liqi_impuesto_val"			: 0,
					"liqi_importe_total"		: mImporteTotal,
					"user_updated"				: Ax.ext.user.getCode(),
					"date_updated"				: new Ax.util.Date().setConnection(Ax.db)
				},
				{
					"liqi_id"					: mRowLiqImpNot.liqi_id
				}
			);
		}

		// Query para obtener el total desde impuesto
		let mRsDatosEconomicos = Ax.db.executeQuery(`
			<select>
				<columns>
					SUM(<nvl>liqi_importe_bruto			,0</nvl>) <alias name='importe_bruto'		/>,
					SUM(<nvl>liqi_importe_descto		,0</nvl>) <alias name='importe_descto'		/>,
					SUM(<nvl>liqi_importe_subtot		,0</nvl>) <alias name='importe_subtot'		/>,
					SUM(<nvl>liqi_impuesto_subtot		,0</nvl>) <alias name='impuesto_subtot'		/>,
					SUM(<nvl>liqi_importe_far			,0</nvl>) <alias name='importe_far'			/>,
					SUM(<nvl>liqi_importe_far_exc		,0</nvl>) <alias name='importe_far_exc'		/>,
					SUM(<nvl>liqi_importe_cli			,0</nvl>) <alias name='importe_cli'			/>,
					SUM(<nvl>liqi_importe_ser			,0</nvl>) <alias name='importe_ser'			/>,
					SUM(<nvl>liqi_importe_hon			,0</nvl>) <alias name='importe_hon'			/>,
					SUM(<nvl>liqi_importe_equi			,0</nvl>) <alias name='importe_equi'		/>,
					SUM(<nvl>liqi_importe_ded			,0</nvl>) <alias name='importe_ded'			/>,
					SUM(<nvl>liqi_impuesto_ded			,0</nvl>) <alias name='impuesto_ded'		/>,
					SUM(<nvl>liqi_importe_consulta		,0</nvl>) <alias name='importe_consulta'	/>,
					SUM(<nvl>liqi_importe_dif_cuarto	,0</nvl>) <alias name='importe_dif_cuarto'	/>,
					SUM(<nvl>liqi_impuesto_dif_cuarto	,0</nvl>) <alias name='impuesto_dif_cuarto'	/>,
					SUM(<nvl>liqi_importe_coa			,0</nvl>) <alias name='importe_coa'			/>,
					SUM(<nvl>liqi_impuesto_coa			,0</nvl>) <alias name='impuesto_coa'		/>,
					SUM(<nvl>liqi_importe_coa_exc		,0</nvl>) <alias name='importe_coa_exc'		/>,
					SUM(<nvl>liqi_impuesto_coa_exc		,0</nvl>) <alias name='impuesto_coa_exc'	/>,
					SUM(<nvl>liqi_importe_coa_pp		,0</nvl>) <alias name='importe_coa_pp'		/>,
					SUM(<nvl>liqi_impuesto_coa_pp		,0</nvl>) <alias name='impuesto_coa_pp'		/>,
					SUM(<nvl>liqi_importe_nocubi		,0</nvl>) <alias name='importe_nocubi'		/>,
					SUM(<nvl>liqi_impuesto_nocubi		,0</nvl>) <alias name='impuesto_nocubi'		/>,
					SUM(<nvl>liqi_importe_nocubi_exc	,0</nvl>) <alias name='importe_nocubi_exc'	/>,
					SUM(<nvl>liqi_impuesto_nocubi_exc	,0</nvl>) <alias name='impuesto_nocubi_exc'	/>,
					SUM(<nvl>liqi_importe_neto			,0</nvl>) <alias name='importe_neto'		/>,
					SUM(<nvl>liqi_impuesto_val			,0</nvl>) <alias name='impuesto_val'		/>,
					SUM(<nvl>liqi_importe_total			,0</nvl>) <alias name='importe_total'		/>
				</columns>
				<from table='fas_liquidacion_impuesto' />
				<where>
					liq_id = ?
				</where>
			</select>
		`, pIDLiquidacion).toOne();

		
		// Si el importe total resulta negativo, se asigna un monto 0 a todos los totales
		if (mRsDatosEconomicos.importe_total < 0.0) {

			mRsDatosEconomicos.importe_neto		= 0;
			mRsDatosEconomicos.impuesto_val		= 0;
			mRsDatosEconomicos.importe_total	= 0;

			Ax.db.update("fas_liquidacion_impuesto",
				{
					"liqi_importe_neto"		: 0,
					"liqi_impuesto_val"		: 0,
					"liqi_importe_total"	: 0
				},
				{
					"liq_id"				: pIDLiquidacion
				}
			);
		}

		// Agregar los datos económicos a los registros de impuesto de la liquidación
		Ax.db.update("fas_liquidacion",
			{
				"liq_importe_bruto"			: mRsDatosEconomicos.importe_bruto,
				"liq_importe_descto"		: mRsDatosEconomicos.importe_descto,
				"liq_importe_subtot"		: mRsDatosEconomicos.importe_subtot,
				"liq_impuesto_subtot"		: mRsDatosEconomicos.impuesto_subtot,
				"liq_importe_far"			: mRsDatosEconomicos.importe_far,
				"liq_importe_far_exc"		: mRsDatosEconomicos.importe_far_exc,
				"liq_importe_cli"			: mRsDatosEconomicos.importe_cli,
				"liq_importe_ser"			: mRsDatosEconomicos.importe_ser,
				"liq_importe_hon"			: mRsDatosEconomicos.importe_hon,
				"liq_importe_equi"			: mRsDatosEconomicos.importe_equi,
				"liq_importe_ded"			: mRsDatosEconomicos.importe_ded,
				"liq_impuesto_ded"			: mRsDatosEconomicos.impuesto_ded,
				"liq_importe_consulta"		: mRsDatosEconomicos.importe_consulta,
				"liq_importe_dif_cuarto"	: mRsDatosEconomicos.importe_dif_cuarto,
				"liq_impuesto_dif_cuarto"	: mRsDatosEconomicos.impuesto_dif_cuarto,
				"liq_importe_coa"			: mRsDatosEconomicos.importe_coa,
				"liq_impuesto_coa"			: mRsDatosEconomicos.impuesto_coa,
				"liq_importe_coa_exc"		: mRsDatosEconomicos.importe_coa_exc,
				"liq_impuesto_coa_exc"		: mRsDatosEconomicos.impuesto_coa_exc,
				"liq_importe_coa_pp"		: mRsDatosEconomicos.importe_coa_pp,
				"liq_impuesto_coa_pp"		: mRsDatosEconomicos.impuesto_coa_pp,
				"liq_importe_nocubi"		: mRsDatosEconomicos.importe_nocubi,
				"liq_impuesto_nocubi"		: mRsDatosEconomicos.impuesto_nocubi,
				"liq_importe_nocubi_exc"	: mRsDatosEconomicos.importe_nocubi_exc,
				"liq_impuesto_nocubi_exc"	: mRsDatosEconomicos.impuesto_nocubi_exc,
				"liq_importe_neto"			: mRsDatosEconomicos.importe_neto,
				"liq_impuesto_val"			: mRsDatosEconomicos.impuesto_val,
				"liq_importe_total"			: mRsDatosEconomicos.importe_total,
				"liq_tipo_copago_var"		: mObjLiquidacionImportes.liq_tipo_copago_var,
				"user_updated"				: Ax.ext.user.getCode(),
				"date_updated"				: new Ax.util.Date().setConnection(Ax.db)
			},
			{
				"liq_id"					: pIDLiquidacion
			}
		);

		return mRsDatosEconomicos.importe_total
		// END function [__insertDatosEconomicos]
	}

	function __calcularDiferenciaCarta(pIDLiquidacion) {
		
		// DifCarta = ( SUM( (Consumos - Deducible - DifCuarto - NoCubiertos) * (Impuesto) ) - TopeCarta / (1 - %CoaPac) ) / IGV
		let mMontoCarta = Ax.db.executeGet(`
			<select>
				<columns>
					SUM ( ( (liqi_importe_subtot - liq_importe_ded - liqi_importe_dif_cuarto - liqi_importe_nocubi) * (1+fas_liquidacion_impuesto.imp_porcentaje/100)
					- <nvl>acg_importe_total,0</nvl> / (1 - acg_copago_pac/100) ) / (1 + fas_impuesto.imp_porcentaje/100) ) <alias name='importe_carta'/>
				</columns>
				<from table='fas_liquidacion_impuesto'>
					<join table='fas_liquidacion'>
						<on>fas_liquidacion.liq_id = fas_liquidacion_impuesto.liq_id</on>
						<join type='left' table='fas_admision_cg'>
							<on>fas_admision_cg.acg_id = fas_liquidacion.liq_cg_id</on>
							<on>fas_liquidacion_impuesto.liqi_impuesto = 'IGV'</on>
						</join>
					</join>
					<join table='fas_impuesto'>
						<on>fas_impuesto.imp_codigo = 'IGV'</on>
					</join>
				</from>
				<where>
					fas_liquidacion_impuesto.liq_id = ?
				</where>
			</select>;
		`, pIDLiquidacion);

		// Si se obtiene una diferencia de carta mayor a 0, se agrega a la liquidación
		if (Ax.math.bc.compareTo(mMontoCarta||0, 0) == 1 ) {
			Ax.db.update('fas_liquidacion_impuesto',
				{
					"liqi_auxiliar1"	: mMontoCarta
				}
			)
		}

		// PENDIENTE: DIFERENCIA DE CARTA AFECTA EL COASEGURO
		// AVERIGUAR SI EDITAR EL COASEGURO O GENERAR NUEVO CAMPO DIFERENCIA CARTA COASEGURO (Sobreescribir de momento)

		// END function [__calcularDiferenciaCarta]
	}

	let mLiqImpTotal = 0;

	// Obtener datos de la liquidación
	let mObjLiquidacion = Ax.db.executeQuery(`
		<select>
			<columns>
				fas_liquidacion.*,
				fas_ambito.amb_grupo_cod <alias name='liq_ambito_grupo'/>,
				fas_liquidacion_tipo.liqt_excedente,
				fas_liquidacion_tipo.liqt_tipoexc,
				fas_cuenta.cnt_numero,
				fas_cuenta.cnt_tipo_fac,
				fas_cuenta.cnt_ind_prevrs,
				fas_cuenta.cnt_ind_exc_gar,
				fas_empresa.emp_divisa,
				fas_admision.adm_tipo_orden_atencion,
                fas_admision.adm_ind_oaa_principal,
				fas_admision.adm_fecha_alta,
				fas_admision.adm_fecha_validacion,
				fas_admision.adm_tari_hotel_prestacion,
				<!--    PAQUETE -->
				fas_cuenta.cnt_presta_paq,
				fas_cuenta.cnt_paq_acp_id
			</columns>
			<from table='fas_liquidacion'>
				<join table='fas_liquidacion_tipo'>
					<on>fas_liquidacion.liq_tipo = fas_liquidacion_tipo.liqt_codigo</on>
				</join>
				<join table='fas_cuenta'>
					<on>fas_liquidacion.liq_cnt_id = fas_cuenta.cnt_id</on>
				</join>
				<join table='fas_centro'>
					<on>fas_liquidacion.liq_centro = fas_centro.cen_codigo</on>
					<join table='fas_empresa'>
						<on>fas_centro.emp_codigo= fas_empresa.emp_codigo</on>
					</join>
				</join>
				<join table='fas_admision'>
					<on>fas_liquidacion.liq_episodio = fas_admision.adm_episodio</on>
				</join>
				<join table='fas_ambito'>
					<on>fas_liquidacion.liq_ambito = fas_ambito.amb_codigo</on>
				</join>
			</from>
			<where>
				fas_liquidacion.liq_id = ?
			</where>
		</select>
	`, pIDLiquidacion).toOne().setRequired(`Liquidacion con Id. [${pIDLiquidacion}] no encontrada`);

	// Obtenemos la solicitud de cobro de admision para ambulatorio con estado cobrado
	let mobjCobroAdm = {};

	if (mObjLiquidacion.liq_ambito_grupo == 'C') {

		mobjCobroAdm = Ax.db.executeQuery(`
			<select first = '1'>
				<columns>
					*
				</columns>
				<from table='fas_solicitud_cobro_admision' />
				<where>
					sca_episodio = ?
					AND sca_estado ='C'
				</where>
				<order>
					1 DESC
				</order>
			</select>
			`,mObjLiquidacion.liq_episodio).toOne();
	}

	if (mObjLiquidacion.liqt_excedente == 1) {
		throw new Ax.ext.Exception('LIQUIDACION_CALCIMPORT_NOEXC',
			'Cuenta [${cnt_numero}] con liquidación [${liq_numero}] es de excedente. Los cálculos de importe se deben realizar sobre la liquidación principal.',
			{
				cnt_numero : mObjLiquidacion.cnt_numero,
				liq_numero : mObjLiquidacion.liq_numero
			});
	}

	let mBoolNoCopago = false;
	// Se excluirá el copago para Financiadores Particulares de Contrato tipo Contado Integral
	if (mObjLiquidacion.liq_tipo == '03') {
		let mContadoIntegral = Ax.db.executeGet(`
			<select>
				<columns>
					COUNT(*)
				</columns>
				<from table='fas_financiador'/>
				<where>
						fin_codigo = ?
					AND fin_tipo_contrato = '3'
					AND fin_tipo_financiador = '3'
				</where>
			</select>
		`, mObjLiquidacion.liq_financiador)
		mBoolNoCopago = mContadoIntegral >= 1 ? true : false;
	}

	let mFloatDedIGV = 0;
	let mFloatCoaExc = 0;

	// Generando objeto de datos económicos
	let mObjLiquidacionImportes = {
		"liq_tipo_copago_var"		: mObjLiquidacion.liq_tipo_copago_var || 0,	//  Tipo de copago variable
		"liq_importe_ded"			: mObjLiquidacion.liq_importe_ded || 0,		//  Importe Deducible (Sin IGV)
		"liq_importe_consulta"		: 0,										//  Importe correspondiente al concepto consulta
		"liq_importe_dif_cuarto"	: 0,										//  Importe correspondiente al concepto consulta
		"liq_importe_coa"			: 0											//  Importe relevante a Coaseguro de prestaciones
	}

	let mArrayExc	= [];
	let mExcedente	= "S";

	/**
	 * Recuperando datos de autorización
	 * Planilla Feban: aut_cargo_tipo = 4 => deducible 0 y copago 100
	 *
	 * 2023-10-02: Se agregan programas para soportar las garantías.
	 *             En el caso de una autorización, estirar la información de fas_admision_aut
	 *             En el caso de una garantía, estirar la información del join fas_admision_garantia / fas_admision_cg
	 */
	let mObjAutorizacion = {};

	if (mObjLiquidacion.liq_aut_id && !mObjLiquidacion.liq_cg_id) {
		// La liquidación usa autorización
		mObjAutorizacion = Ax.db.executeQuery(`
			<select>
				<columns>
					fas_admision_aut.aut_id,
					fas_admision_aut.aut_tipo,
					fas_admision_aut.aut_financiador,
					fas_admision_aut.aut_plan,
					fas_admision_aut.aut_divisa,
					fas_admision_aut.aut_tipo_copago_var,
					fas_admision_aut.aut_ind_iva,
					fas_admision_aut.aut_calif_ded,

					'03'		<alias name='acg_deducible'/>, <!-- Se asigna Monto Fijo por defecto -->

					CASE WHEN aut_cargo_tipo = '4'
						 THEN 0
						 ELSE <nvl>fas_admision_aut.aut_importe_ded,0</nvl>
					 END aut_importe_ded,

					fas_admision_aut.aut_presta_ded,
					fas_admision_aut.aut_fecha_fin_ded,
					fas_admision_aut.aut_divisa_ded,
					fas_admision_aut.aut_porcen_ded,
					fas_admision_aut.aut_ind_iva,

					CASE WHEN aut_cargo_tipo = '4'
						 THEN 100
						 ELSE fas_admision_aut.aut_copago
					 END aut_copago,

					CASE WHEN aut_cargo_tipo = '4'
						 THEN 100
						 ELSE fas_admision_aut.aut_copago_far
					 END aut_copago_far
				</columns>
				<from table='fas_admision_aut'/>
				<where>
					aut_id = ?
				</where>
			</select>
		`, mObjLiquidacion.liq_aut_id).toOne();

	} else if (!mObjLiquidacion.liq_aut_id && mObjLiquidacion.liq_cg_id) {
		/**
		 * Para los ambitos AMBULATORIO y EMERGENCIA, se debe realizar el cálculo del copago variable, ya que no lo guardamos
		 * en ningun campo
		 *
		 * Para el ámbito HOSPITALARIO, el tipo de copago es siempre diferencia del deducible. Las garantías vienen siempre para hospitalario
		 */
		mObjAutorizacion = Ax.db.executeQuery(`
			<select>
				<columns>
					fas_admision_garantia.autg_id			<alias name='aut_id'/>,
					fas_admision_garantia.autg_financiador	<alias name='aut_financiador'/>,
					fas_admision_garantia.autg_plan			<alias name='aut_plan'/>,
					fas_admision_cg.acg_divisa				<alias name='aut_divisa'/>,

					<!-- Para el ámbito HOSPITALARIO, el tipo de copago es siempre diferencia -->
					<!-- del deducible (4). Las garantías vienen siempre para hospitalario-->
					'4'										<alias name='aut_tipo_copago_var'/>,

					'ZE'									<alias name='aut_calif_ded'/>, <!-- Forzamos el deducible: ZE-->
					fas_admision_cg.acg_deducible,

					fas_admision_cg.acg_cuarto_cubierto,

					<!--	Asignando la prestación adecuada según el código	-->
					CASE WHEN fas_admision_cg.acg_cuarto_cubierto = '01' THEN '000101'
						 WHEN fas_admision_cg.acg_cuarto_cubierto = '02' THEN '000102'
						 WHEN fas_admision_cg.acg_cuarto_cubierto = '03' THEN '000103'
						 WHEN fas_admision_cg.acg_cuarto_cubierto = '04' THEN '000106'
						 WHEN fas_admision_cg.acg_cuarto_cubierto = '05' THEN '000107'
						 ELSE '000101' END acg_cuarto_codigo,

					CASE WHEN acg_cargo_tipo = '4'
						 THEN 0
						 ELSE <nvl>fas_admision_cg.acg_importe_ded,0</nvl>
					 END									<alias name='aut_importe_ded'/>,

					CAST (NULL AS CHAR)						<alias name='aut_presta_ded'/>,
					CAST (NULL AS DATE)						<alias name='aut_fecha_fin_ded'/>,
					fas_admision_cg.acg_divisa				<alias name='aut_divisa_ded'/>,
					CAST (NULL AS DATE)						<alias name='aut_porcen_ded'/>,
					fas_admision_cg.acg_ind_iva				<alias name='aut_ind_iva'/>,

					CASE WHEN acg_cargo_tipo = '4'
						 THEN 0
						 ELSE fas_admision_cg.acg_copago
					 END									<alias name='aut_copago'/>,

					CASE WHEN acg_cargo_tipo = '4'
						 THEN 0
						 ELSE NVL(fas_admision_cg.acg_copago_far,fas_admision_cg.acg_copago)
					 END									<alias name='aut_copago_far'/>
				</columns>
				<from table='fas_admision_cg'>
					<join table='fas_admision_garantia' >
						<on>fas_admision_garantia.autg_id = fas_admision_cg.acg_id_garantia</on>
					</join>
				</from>
				<where>
					fas_admision_cg.acg_id = ?
				</where>
			</select>
		`, mObjLiquidacion.liq_cg_id).toOne();
	}

	//	Si la cuenta es por Exceso de carta o es Particular Contado Integral, el deducible es 0
	if (mObjLiquidacion.cnt_ind_exc_gar || mBoolNoCopago) {
		mObjAutorizacion.aut_importe_ded = 0;
	}

	/**
	 * Obteniendo tipo de cambio si la divisa es diferente a la divisa del centro
	 * Se busca para la fecha de cobro del deducible: [C] Validación, [U,H] Alta
	 */
	if (mObjAutorizacion.aut_divisa_ded &&
		mObjAutorizacion.aut_divisa_ded != mObjLiquidacion.emp_divisa) {

		let divisa_ext = mObjAutorizacion.aut_divisa_ded;
		let divisa_loc = mObjLiquidacion.emp_divisa;
		let divisa_fecha = mObjLiquidacion.liq_ambito_grupo == 'C' ?
			mObjLiquidacion.adm_fecha_validacion : mObjLiquidacion.adm_fecha_alta;

		let mFloatCambio = Ax.db.executeGet(`
			<select first='1'>
				<columns>
					<nvl>dvs_comp,dvs_cambio</nvl> <alias name='cambio'/>
				</columns>
				<from table='fas_divisa_sunat'/>
				<where>
					dvs_divisa_ori  = ? AND dvs_divisa_dest  = ? AND
					dvs_fecha &lt;= ?
				</where>
				<order>
					dvs_fecha DESC
				</order>
			</select>`,
		divisa_loc, divisa_ext, divisa_fecha);

		if (mFloatCambio) {
			mObjAutorizacion.aut_importe_ded = Ax.math.bc.mul(
				mObjAutorizacion.aut_importe_ded,
				mFloatCambio
			)
		} else {
			throw new Ax.ext.Exception('LIQUIDACION_CALCIMPORT_NOCAMB',
				"No se ha encontrado un tipo de cambio para la divisa [${aut_divisa_ded}].",
				{
					aut_divisa_ded : mObjAutorizacion.aut_divisa_ded
				}
			);
		}
	}

	// Obtener Impuesto
	let mObjIGV = Ax.db.executeQuery(`
		<select>
			<columns>
				imp_porcentaje / 100 prc,
				(imp_porcentaje + 100) / 100 prc_total
			</columns>
			<from table='fas_impuesto'/>
			<where>
				imp_codigo = 'IGV'
			</where>
		</select>
	`).toOne();

	/**
	 * CÁLCULO DE IMPORTE DE CUARTO CUBIERTO
	 * Necesario cuando:
	 *	- Aplique diferencia de cuarto (Importe C. solicitado > Importe C. cubierto)
	 *	- El Deducible sea tipo Día de cuarto o 1/2 Día de cuarto
	 */
	let mObjCuartoCubierto = {
		pres_codigo	: null,
		importe		: 0
	};

	// Solo calcular en hospitalario, cuando aplique diferencia de cuarto
	if (mObjLiquidacion.liq_ambito_grupo == 'H' &&
		mObjAutorizacion.acg_cuarto_cubierto &&
	  ((mObjLiquidacion.adm_tari_hotel_prestacion &&
		mObjAutorizacion.acg_cuarto_codigo != mObjLiquidacion.adm_tari_hotel_prestacion) ||
		['01','02'].includes(mObjAutorizacion.acg_deducible))) {

		// En hospitalario, almacena la diferencia de cuarto en liq_consulta
		mObjLiquidacionImportes.liq_importe_dif_cuarto = 0;

		mObjCuartoCubierto.pres_codigo = mObjAutorizacion.acg_cuarto_codigo;

		// Obtenemos tarifa de precios asignada
		let mCuartoPrestacion = Ax.db.executeQuery(`
			<select>
				<columns>
					fas_prestacion.pre_codigo,
					fas_prestacion.prg_codigo,
					fas_prestacion.cfa_codigo,
					fas_prestacion.pre_valorar,
					fas_prestacion.pre_ind_descuento,
					fas_concepto_facturable.cfa_tipo_concepto,
					fas_concepto_facturable.cfa_subtipo_concepto
				</columns>
				<from table='fas_prestacion' >
					<join table='fas_concepto_facturable' type='left' >
						<on>fas_prestacion.cfa_codigo = fas_concepto_facturable.cfa_codigo</on>
					</join>
				</from>
				<where>
					fas_prestacion.pre_codigo = ? AND
					fas_prestacion.pre_ind_tarifa_hotel = 1 AND
					fas_prestacion.pre_ind_cond_comercial = 1
				</where>
			</select>
		`, mObjAutorizacion.acg_cuarto_codigo).toOne();

		let mObjCentro = Ax.db.executeQuery(`
			<select>
				<columns>
					fas_centro.cen_codcal calendario,
					fas_centro.cen_cond_comercial cond_comercial,
					fas_centro.cen_prestacion_tar, <!-- Tarifa a usar para prestaciones que paga el paciente -->
					fas_tarifa_prestacion_periodo.tprep_factor_1,
					fas_tarifa_prestacion_periodo.tprep_factor_2,
					fas_centro.cen_prestacion_dto  <!-- Descuento a usar para prestaciones que paga el paciente -->
				</columns>
				<from table='fas_centro'>
					<join table='fas_tarifa_prestacion_periodo' type='left'>
						<on>fas_tarifa_prestacion_periodo.tpre_codigo = fas_centro.cen_prestacion_tar</on>
						<on>fas_tarifa_prestacion_periodo.tprep_fecha_inicio &lt;= DATE(?)</on>
						<on>fas_tarifa_prestacion_periodo.tprep_fecha_fin    &gt;= DATE(?)</on>
					</join>
				</from>
				<where>
					fas_centro.cen_codigo = ?
				</where>
			</select>
		`,  new Ax.sql.Date(mObjLiquidacion.liq_fecha),
			new Ax.sql.Date(mObjLiquidacion.liq_fecha),
			mObjLiquidacion.liq_centro).toOne();

		let mObjTarifaAsignacion = Ax.db.executeCachedQuery(`
			<select>
				<columns>
					fas_tarifa_asignacion.tasg_prestacion_tar,
					fas_tarifa_prestacion_periodo.tprep_factor_1,
					fas_tarifa_prestacion_periodo.tprep_factor_2,
					fas_tarifa_asignacion.tasg_prestacion_dto
				</columns>
				<from table='fas_tarifa_asignacion'>
					<join table='fas_tarifa_prestacion_periodo' type='left'>
						<on>fas_tarifa_prestacion_periodo.tpre_codigo = fas_tarifa_asignacion.tasg_prestacion_tar</on>
						<on>fas_tarifa_prestacion_periodo.tprep_fecha_inicio &lt;= DATE(?)</on>
						<on>fas_tarifa_prestacion_periodo.tprep_fecha_fin	 &gt;= DATE(?)</on>
					</join>
					<join table='fas_descuento_pres' type='left'>
						<on>fas_descuento_pres.dpre_codigo = fas_tarifa_asignacion.tasg_prestacion_dto</on>
						<on>fas_descuento_pres.dpre_estado = 'A'</on>
					</join>
				</from>
				<where>
					fas_tarifa_asignacion.tasg_financiador		= ? AND
					fas_tarifa_asignacion.tasg_plan_cobertura	= ? AND
					fas_tarifa_asignacion.tasg_centro			= ?
				</where>
			</select>
		`,  new Ax.sql.Date(mObjLiquidacion.liq_fecha),
			new Ax.sql.Date(mObjLiquidacion.liq_fecha),
			mObjAutorizacion.aut_financiador,
			mObjAutorizacion.aut_plan,
			mObjLiquidacion.liq_centro).toOne();

		if (!mObjTarifaAsignacion.tasg_prestacion_tar) {
			mObjTarifaAsignacion = {
				"tasg_prestacion_tar"	: mObjCentro.cen_prestacion_tar,
				"tprep_factor_1"		: mObjCentro.tprep_factor_1,
				"tprep_factor_2"		: mObjCentro.tprep_factor_2,
				"tasg_prestacion_dto"	: mObjCentro.cen_prestacion_dto
			};
		}

		// OBTENCION DE PRECIO
		let mObjPrecios = Ax.db.call('obtenerPrecioTarifaPrestacion',
			mObjTarifaAsignacion.tasg_prestacion_tar,
			mObjLiquidacion.liq_fecha,
			mObjAutorizacion.acg_cuarto_codigo
		);

		// Obtenemos descuentos
		if (mObjTarifaAsignacion.tasg_prestacion_dto &&
			mCuartoPrestacion.pre_ind_descuento == 1) {

			let fas_descuento_pres_linea = Ax.db.executeQuery(`
				<select first = '1'>
					<columns>
						CASE WHEN fas_descuento_pres_linea.dprel_grupo  IS NOT NULL THEN 2
							 WHEN fas_descuento_pres_linea.dprel_prestacion  IS NOT NULL THEN 1
							 WHEN fas_descuento_pres_linea.dprel_confac_tipo IS NOT NULL AND fas_descuento_pres_linea.dprel_confac_stipo IS NOT NULL THEN 3
							 WHEN fas_descuento_pres_linea.dprel_confac_tipo IS NOT NULL THEN 4
							ELSE 5
						END priori,
						fas_descuento_pres_linea.dprel_descuento
					</columns>
					<from table = 'fas_descuento_pres_periodo'>
						<join  table = 'fas_descuento_pres_linea'>
							<on>fas_descuento_pres_linea.dpre_codigo	= fas_descuento_pres_periodo.dpre_codigo</on>
							<on>fas_descuento_pres_linea.dprep_id		= fas_descuento_pres_periodo.dprep_id</on>
						</join>
					</from>
					<where>
							fas_descuento_pres_periodo.dpre_codigo			= ?
						AND fas_descuento_pres_periodo.dprep_fecha_inicio	&lt;= DATE(?)
						AND (fas_descuento_pres_periodo.dprep_fecha_fin		&gt;= DATE(?) OR fas_descuento_pres_periodo.dprep_fecha_fin IS NULL)
						AND (fas_descuento_pres_linea.dprel_ambito			= ? OR fas_descuento_pres_linea.dprel_ambito IS NULL)
						AND (fas_descuento_pres_linea.dprel_prestacion		= ? OR ? LIKE TRIM(fas_descuento_pres_linea.dprel_grupo)||'%' OR fas_descuento_pres_linea.dprel_prestacion IS NULL)
						AND (fas_descuento_pres_linea.dprel_confac			= ? OR fas_descuento_pres_linea.dprel_confac IS NULL)
						AND (fas_descuento_pres_linea.dprel_confac_tipo		= ? OR fas_descuento_pres_linea.dprel_confac_tipo  IS NULL)
					</where>
					<order>
						1
					</order>
				</select>
			`,	mObjTarifaAsignacion.tasg_prestacion_dto,
				new Ax.sql.Date(mObjLiquidacion.liq_fecha),
				new Ax.sql.Date(mObjLiquidacion.liq_fecha),
				mObjLiquidacion.liq_ambito,
				mObjAutorizacion.acg_cuarto_codigo,
				mCuartoPrestacion.prg_codigo,
				mCuartoPrestacion.acp_concep_fact,
				mCuartoPrestacion.cfa_tipo_concepto
			).toOne();

			mObjPrecios.descuento_prc = fas_descuento_pres_linea.dprel_descuento || 0;
		}

		// Cálculo del importe neto, impuestos y totales
		mObjPrecios.precio_neto = Ax.math.bc.mul(mObjPrecios.precio, Ax.math.bc.sub(100, mObjPrecios.descuento_prc || 0));
		mObjPrecios.precio_neto = Ax.math.bc.div(mObjPrecios.precio_neto, 100).setScale(2, Ax.math.bc.RoundingMode.HALF_UP);

		//	Definiendo el precio
		mObjCuartoCubierto.importe = mObjPrecios.precio_neto;

		// FIN OBRENER TARIFA
	}
	// FIN CÁLCULO DE DIFERENCIA DE CUARTO

	/**
	 * ACTIVIDADES AGRUPADAS
	 * Objeto para almacenar información de las prestaciones afectadas por deducible
	 * CONSULTAS: Cantidad y monto total ()
	 * CUARTOS: Cantidad, monto total y primer cuarto (u honorario) enlistado
	 * Nota: Para el monto total de cuarto cuando este es de concepto [1] CUARTO Y ALIMENTACIÓN,
	 * se toma el menor valor entre el cuarto que utiliza el paciente y el cuarto cubierto
	 * Nota2: El deducible se aplica sobre una prestación bajo la siguiente prioridad:
	 * Concepto facturable Cuarto > Honorarios Médicos > Clínica > Servicios Auxiliares
	 */
	let mObjGrupoActividad = Ax.db.executeQuery(`
		<select>
			<columns>
				SUM (CASE WHEN fas_prestacion.prg_codigo IN ('5001','5002')
						THEN 1
						ELSE 0 END)				<alias name='consulta_cant'/>,
				SUM (CASE WHEN fas_prestacion.prg_codigo IN ('5001','5002')
						THEN liql_importe_neto
						ELSE 0 END)				<alias name='consulta_total'/>,
				SUM (CASE WHEN fas_liquidacion_linea.liql_concep_fact IN ('1','2','4','7')
						THEN 1
						ELSE 0 END)				<alias name='cuartos_cant'/>,
				SUM (CASE WHEN fas_liquidacion_linea.liql_concep_fact = '1'
						THEN LEAST(${mObjCuartoCubierto.importe},liql_importe_neto)
						WHEN fas_liquidacion_linea.liql_concep_fact IN ('2','4')
						THEN liql_importe_neto
						WHEN fas_liquidacion_linea.liql_concep_fact = '7'
						THEN 0
						ELSE 0 END)				<alias name='cuartos_total'/>,
				<!-- Se recupera el primer cuarto. Si no existe, se toma el primer honorario -->
				NVL (MIN (CASE WHEN fas_liquidacion_linea.liql_concep_fact IN ('1','2','4','7')
							   THEN liql_id
							   ELSE NULL END),
					NVL (MIN (CASE WHEN fas_concepto_facturable.cfa_tipo_concepto = '3'
									AND NVL('${mObjAutorizacion.acg_deducible}','') = '03'
								   THEN liql_id
								   ELSE NULL END),
						NVL (MIN (CASE WHEN fas_concepto_facturable.cfa_tipo_concepto = '1'
										AND NVL('${mObjAutorizacion.acg_deducible}','') = '03'
									   THEN liql_id
									   ELSE NULL END),
							 MIN (CASE WHEN fas_concepto_facturable.cfa_tipo_concepto = '2'
										AND NVL('${mObjAutorizacion.acg_deducible}','') = '03'
									   THEN liql_id
									   ELSE NULL END) ) ) ) <alias name='liql_deducible'/>
			</columns>
			<from table='fas_liquidacion_linea'>
				<join table='fas_prestacion'>
					<on>fas_liquidacion_linea.liql_presta_fact=fas_prestacion.pre_codigo</on>
				</join>
				<join type='left' table='fas_concepto_facturable'>
					<on>fas_liquidacion_linea.liql_concep_fact = fas_concepto_facturable.cfa_codigo</on>
				</join>
			</from>
			<where>
				fas_liquidacion_linea.liql_estado NOT IN ('R','N','Z','Q','X') AND
				fas_liquidacion_linea.liql_cubierto = 1 AND
				fas_liquidacion_linea.liq_id = ?
			</where>
		</select>
	`, pIDLiquidacion).toOne();

	// /**
	//  * Actualizacion del deducible
	// */
	
	// if(mObjGrupoActividad.liql_deducible != null && mObjGrupoActividad.liql_deducible != ''){
	// 	let newIdLiqL = Ax.db.executeGet(`
	// 		<select first='1'>
	// 			<columns>
	// 				liql_id
	// 			</columns>
	// 			<from table='fas_liquidacion_linea'>
	// 			</from>
	// 			<where>
	// 					fas_liquidacion_linea.liql_estado NOT IN ('R','N','Z','Q','X')
	// 				AND fas_liquidacion_linea.liql_concep_fact IN ('1','2','4','7')
	// 				AND fas_liquidacion_linea.liql_cubierto = 1
	// 				AND fas_liquidacion_linea.liq_id = ?
	// 			</where>
	// 			<order>liql_importe_neto DESC, liql_id ASC</order>
	// 		</select>
	// 	`, pIDLiquidacion);
    //     console.log('NUEVO DEDUCIBLE', newIdLiqL);
	// 	mObjGrupoActividad.liql_deducible = (newIdLiqL != null && newIdLiqL != '') ? newIdLiqL : mObjGrupoActividad.liql_deducible
	// }

	// En emergencia se acumula la consulta
	if (mObjLiquidacion.liq_ambito_grupo == 'U') {
		mObjLiquidacionImportes.liq_importe_consulta = mObjGrupoActividad.consulta_total;
	}
	// PROMEDIO DÍA DE CUARTO
	if (mObjLiquidacion.liq_ambito_grupo == 'H') {
		mObjGrupoActividad['cuartos_avg'] = Ax.math.bc.div(
			mObjGrupoActividad.cuartos_total || 0,
			mObjGrupoActividad.cuartos_cant || 1
		)
	}

	// Se almacena el deducible con IGV en una variable, y sin IGV en la cabecera
	if (mObjAutorizacion.aut_ind_iva == 0) {
		mFloatDedIGV = Ax.math.bc.mul(
			mObjAutorizacion.aut_importe_ded,
			mObjIGV.prc_total
		);
	}
	else {
		mFloatDedIGV = mObjAutorizacion.aut_importe_ded;
		mObjAutorizacion.aut_importe_ded = Ax.math.bc.div(
			mObjAutorizacion.aut_importe_ded,
			mObjIGV.prc_total
		);
	}

	// Almacenando datos de la autorización en la cabecera de datos económicos
	mObjLiquidacionImportes.liq_tipo_copago_var	= mObjAutorizacion.aut_tipo_copago_var;
	mObjLiquidacionImportes.liq_coaseguro_gen	= mObjAutorizacion.aut_copago;
	mObjLiquidacionImportes.liq_copago_far		= mObjAutorizacion.aut_copago_far;
	mObjLiquidacionImportes.liq_importe_ded		= 0;

	// Indicador de la existencia prestaciones de Honorarios Médicos
	let mExistHonorario = false;

	// Indicador para saber si se toma el deducible de la admision ambulatorioa
	let mDeduAmbu = false;

	/**
	 *  HOSPITALARIO
	 * 
	 * Se aplica el deducible siempre y cuando exista una prestación apropiada
	 */
	if (mObjGrupoActividad.liql_deducible &&
		mObjLiquidacion.liq_ambito_grupo == 'H') {

		// Se inicaliza el factor que multiplica al día de cuarto
		let factorDiaCuarto = 1;

		switch (mObjAutorizacion.acg_deducible) {
			case '00':
				// SIN DEDUCIBLE
				mObjLiquidacionImportes.liq_importe_ded = 0;
				break;
			case '01':
				// 1/2 DÍA DE CUARTO
				factorDiaCuarto = 0.5;
			case '02':
				// DÍA DE CUARTO
				mObjLiquidacionImportes.liq_importe_ded = Ax.math.bc.mul(
					mObjGrupoActividad.cuartos_avg,
					factorDiaCuarto
				);
				break;
			case '03':
				// MONTO FIJO
				mObjLiquidacionImportes.liq_importe_ded = mObjAutorizacion.aut_importe_ded;
				break;
		}
        console.log('IMP-DEDU', mObjLiquidacionImportes.liq_importe_ded);
	}
	// FIN HOSPITALARIO


    /**
	 * Actualizacion del deducible
	*/
	
	if(mObjGrupoActividad.liql_deducible != null && mObjGrupoActividad.liql_deducible != ''){
		let mObjNewLiqL = Ax.db.executeQuery(`
			<select first='1'>
				<columns>
					liql_id, liql_concep_fact, liql_importe_neto,
                    CASE WHEN fas_liquidacion_linea.liql_concep_fact IN ('1','2','4','7') AND liql_importe_neto - ${mObjLiquidacionImportes.liq_importe_ded} &gt;= 0 THEN 1
                        WHEN fas_liquidacion_linea.liql_concep_fact = '5' AND liql_importe_neto - ${mObjLiquidacionImportes.liq_importe_ded} &gt;= 0 THEN 2
                        WHEN fas_liquidacion_linea.liql_concep_fact = '268' AND liql_importe_neto - ${mObjLiquidacionImportes.liq_importe_ded} &gt;= 0 THEN 3
						WHEN fas_liquidacion_linea.liql_concep_fact = '267' AND liql_importe_neto - ${mObjLiquidacionImportes.liq_importe_ded} &gt;= 0 THEN 4
                        ELSE 99
                    END orden
				</columns>
				<from table='fas_liquidacion_linea'>
				</from>
				<where>
						fas_liquidacion_linea.liql_estado NOT IN ('R','N','Z','Q','X')
					AND fas_liquidacion_linea.liql_concep_fact IN ('1','2','4','7', '5', '267', '268')
					AND fas_liquidacion_linea.liql_cubierto = 1
					AND fas_liquidacion_linea.liq_id = ?
				</where>
				<order>orden ASC, liql_importe_neto DESC, liql_id ASC</order>
			</select>
		`, pIDLiquidacion).toOne();
        console.log('NUEVO DEDUCIBLE', mObjNewLiqL, pIDLiquidacion);
		mObjGrupoActividad.liql_deducible = (mObjNewLiqL.liql_id != null && mObjNewLiqL.liql_id != '') ? mObjNewLiqL.liql_id : mObjGrupoActividad.liql_deducible
	}



	// Obtener datos de las lineas de la liquidación
	let mRsLiquidacionLinea = Ax.db.executeQuery(`
		<select>
			<columns>
				fas_liquidacion_linea.liql_id,
				fas_liquidacion_linea.acp_id,
				fas_liquidacion_linea.acd_id,
				fas_liquidacion_linea.liql_estado,
				fas_liquidacion_linea.liql_presta_fact,
				fas_prestacion.prg_codigo,
				fas_liquidacion_linea.liql_concep_fact,
				<nvl>fas_concepto_facturable.cfa_tipo_concepto,'0'</nvl> <alias name='cfa_tipo_concepto' />,
				fas_liquidacion_linea.liql_cubierto,
				fas_liquidacion_linea.liql_cantidad,
				fas_impuesto.imp_porcentaje/100 imp_porcentaje,
				fas_liquidacion_linea.liql_importe_neto,
				fas_actividad_pres.acp_autc_id,
				fas_liquidacion_linea.liql_factor_coa,
				fas_liquidacion_linea.liql_importe_neto_coa,
				fas_liquidacion_linea.liql_impuesto_coa,
				fas_liquidacion_linea.liql_importe_total_coa,
				fas_actividad_pres.acp_uup_id,
				fas_actividad_pres.acp_cantidad_uup,
				fas_prestacion.pre_ind_tarifa_hotel,
				<nvl>fas_actividad_pres.acp_cob_dif,fas_actividad_prod.acd_cob_dif</nvl> <alias name='act_cob_dif'/>
			</columns>
			<from table='fas_liquidacion_linea'>
				<join type='left' table='fas_prestacion'>
					<on>fas_liquidacion_linea.liql_presta_fact=fas_prestacion.pre_codigo</on>
				</join>
				<join type='left' table='fas_concepto_facturable'>
					<on>fas_liquidacion_linea.liql_concep_fact = fas_concepto_facturable.cfa_codigo</on>
					<join type='left' table='fas_concepto_facturable_tipo'>
						<on>fas_concepto_facturable.cfa_tipo_concepto = fas_concepto_facturable_tipo.cft_codigo</on>
					</join>
				</join>
				<join type='left' table='fas_impuesto'>
					<on>fas_liquidacion_linea.liql_impuesto=fas_impuesto.imp_codigo</on>
				</join>
				<join type='left' table='fas_actividad_pres'>
					<on>fas_liquidacion_linea.acp_id=fas_actividad_pres.acp_id</on>
				</join>
				<join type='left' table='fas_actividad_prod'>
					<on>fas_liquidacion_linea.acd_id=fas_actividad_prod.acd_id</on>
				</join>
			</from>
			<where>
					fas_liquidacion_linea.liq_id = ?
				AND fas_liquidacion_linea.liql_estado NOT IN ('R','N','Z','Q','X') <!-- No considera retiradas ni anuladas-->
			</where>
		</select>
	`, pIDLiquidacion);

	// Recorrer las líneas de liquidación para calcular importes
	for (let mRowLiquidacionLinea of mRsLiquidacionLinea) {

		// Definir si el consumo es una prestación o un producto
		let mBoolEsProducto = mRowLiquidacionLinea.acd_id ? 1 : 0;

		/*
		 *  Se aplican los coaseguros correspondientes a cada linea. El Factor Coa
		 *  determina qué porcentaje de gastos cubre el Financiador
		 */
		let mFloatFactorCoa = null;

		/*
		 *  Esta variable la necesitamos para guardar el importe que corresponde a
		 *  cálculo por diferencia deducible
		 */
		let mImporteDifDeducible = null;

		// Esta variable se utilizará para almacenar la diferencia de cuarto
		let mImporteDifCuarto = null;

		// Indicador de la existencia de consumos de tipo Honorario en la liquidación
		mExistHonorario = mRowLiquidacionLinea.cfa_tipo_concepto == '3' ? true : mExistHonorario;

		/*
			Indicador paradeterminar si aplica deducible de ambulatorio cuando:
			Tipo atencion sea
				[S] Servicio Auxiliar
				[E] Examen Especial
				[F] Solo Farmacia
				[O] Orden Externa

			Admision sea principal

		*/
		if (['S','E','F','O'].includes(mObjLiquidacion.adm_tipo_orden_atencion) && mObjLiquidacion.adm_ind_oaa_principal == 1) {

			// si no es siteds
			if (mObjAutorizacion.aut_tipo != '01') {
				mDeduAmbu = true
			}else if(mObjAutorizacion.aut_tipo == '01' && ['00061366', '00059951'].includes(mObjAutorizacion.aut_financiador)){
				mDeduAmbu = true
			}else{
				mDeduAmbu = false
			}
			
		}

		/**
		 * Si una línea fue definida como Excedente/No cubierta en algún proceso, se
		 * define su factor coaseguro como NULO (La asume en su totalidad el Paciente
		 * pero no se marca como parte del coaseguro)
		 */
		if (mRowLiquidacionLinea.liql_cubierto == 0) {
			mFloatFactorCoa = null;
		} else {

			// Se asigna el coaseguro según el tipo de consumo
			if (mBoolEsProducto) {
				// Copago farmacia para productos
				mFloatFactorCoa = mObjAutorizacion.aut_copago_far;

				// HOSPITALARIO
				if (mObjLiquidacion.liq_ambito_grupo == 'H') {
					//  COBERTURA DIFERENCIADA
					if (mRowLiquidacionLinea.act_cob_dif) {
						mFloatFactorCoa = mRowLiquidacionLinea.liql_factor_coa;
					}
				}
			} else {

				/**
				 * Se inicializan los valores de copago de la línea
				 * % Coaseguro: De la autorización
				 * Incremento de deducible: 0
				 */
				let mFloatDedIncr	= mObjAutorizacion.aut_importe_ded;
					mFloatFactorCoa	= mObjAutorizacion.aut_copago;

				let mBoolAplicaUUP	= mRowLiquidacionLinea.acp_uup_id && mObjAutorizacion.aut_calif_ded == '01';
				let mBoolCopagoDiff	= !mBoolAplicaUUP && mRowLiquidacionLinea.acp_autc_id;
				let mBoolEsConsulta	= !mBoolAplicaUUP && ['5001','5002'].includes(mRowLiquidacionLinea.prg_codigo);
				let mBoolEsCuarto	= ['1','2','4','7'].includes(mRowLiquidacionLinea.liql_concep_fact);

				// EMERGENCIA [VERIFICAR + AMBULATORIO]
				if (['U','C'].includes(mObjLiquidacion.liq_ambito_grupo)) {

					// Para las autorizacion que tengan una cuenta diferenta a CPM no se le apliza deducible
					if (pAplicaDedu == 0) {
						mObjAutorizacion.aut_importe_ded = 0;
					}
					//  DIFERENCIA DE LA CONSULTA - COPAGO DIFERENCIADO
					if (mObjAutorizacion.aut_tipo_copago_var == '2') {

						if (mBoolCopagoDiff) {

							mFloatFactorCoa	= mRowLiquidacionLinea.liql_factor_coa;

							mFloatDedIncr	= Ax.db.executeGet(`
								<select>
									<columns>
										<nvl>autc_importe_ded, 0 </nvl>
									</columns>
									<from table='fas_admision_aut_cond'/>
									<where>
										autc_id =?
									</where>
								</select>
							`, mRowLiquidacionLinea.acp_autc_id);

							mFloatDedIncr = Ax.math.bc.div(
								mFloatDedIncr,
								mObjIGV.prc_total
							);
						} else if (mBoolEsConsulta || mBoolAplicaUUP) {
							// Consulta : Finaciador cubre 100% (Excepto Particular Contado Integral)
							mFloatFactorCoa = !mBoolNoCopago ? 100 : 0;
						}
					}

					switch (mObjAutorizacion.aut_calif_ded) {
						case '01':
							/**
							 * Cálculo de UUPs
							 * Siempre y cuando la actividad tenga un beneficio y el calificador
							 * sea [01]Por servicio
							 */
							if (mBoolAplicaUUP) {
								mFloatDedIncr = Ax.math.bc.mul(
									mObjAutorizacion.aut_importe_ded,
									mRowLiquidacionLinea.acp_cantidad_uup
								)
							};  break;
						case 'P2':
							/**
							 * Calificador: [P2]Deducible igual a Porcentaje  de la consulta
							 * Sobreescribe el Deducible diferenciado
							 */
							if (mBoolEsConsulta) {
								mFloatDedIncr = Ax.math.bc.div(
									Ax.math.bc.div(
										Ax.math.bc.mul(
											mRowLiquidacionLinea.liql_importe_neto,
											mObjAutorizacion.aut_porcen_ded),
										100),
									mObjAutorizacion.aut_ind_iva == 0 ? 1 : mObjIGV.prc_total
								)
							}; break;
					}

					// DIFERENCIA DEL DEDUCIBLE - COPAGO DIFERENCIADO
					if (mObjAutorizacion.aut_tipo_copago_var == '4') {
						if (mBoolAplicaUUP || mBoolEsConsulta) {
							// mImporteDif almacena el sustraendo, no la diferencia
							mImporteDifDeducible = mFloatDedIncr;
						}
					}

					// Se acumula un deducible por cada consumo diferenciado o farmacia, si aplica
					if ((mBoolAplicaUUP || mBoolCopagoDiff || mBoolEsConsulta) && !mBoolNoCopago) {
						mObjLiquidacionImportes.liq_importe_ded = Ax.math.bc.add(
							mObjLiquidacionImportes.liq_importe_ded,
							mFloatDedIncr
						)
					}

				}

				// HOSPITALARIO
				if (mObjLiquidacion.liq_ambito_grupo == 'H') {

					// COBERTURA DIFERENCIADA
					if (mRowLiquidacionLinea.act_cob_dif) {
						mFloatFactorCoa = mRowLiquidacionLinea.liql_factor_coa;
					}

					// DIFERENCIA DEL DEDUCIBLE - COPAGO DIFERENCIADO
					if (['2','4'].includes(mObjAutorizacion.aut_tipo_copago_var)) {

						//  El Deducible se aplica sobre el primer cuarto (u honorario)
						if (mRowLiquidacionLinea.liql_id == mObjGrupoActividad.liql_deducible) {
							mImporteDifDeducible = mObjLiquidacionImportes.liq_importe_ded;
						}
					}

					/**
					 * DIFERENCIA DE CUARTO
					 * Aplicar diferencia de cuarto si:
					 *		- La prestación es de tipo cuarto
					 *		- La prestación tiene indicador de aplicación de tarifa hotelera
					 *		- El paciente ha escogido un cuarto diferente al de su tarifa
					 *		- La prestación corresponde al cuarto escogido por el paciente
					 *		- El precio del cuarto escogido es mayor al de la cobertura
					 */
					if (mBoolEsCuarto &&
						mObjCuartoCubierto.pres_codigo &&
						mRowLiquidacionLinea.pre_ind_tarifa_hotel  &&
						mObjLiquidacion.adm_tari_hotel_prestacion != mObjCuartoCubierto.pres_codigo &&
						mRowLiquidacionLinea.liql_presta_fact == mObjLiquidacion.adm_tari_hotel_prestacion &&
						mRowLiquidacionLinea.liql_importe_neto > mObjCuartoCubierto.importe) {

						// Se acumula la diferencia de cuarto
						mImporteDifCuarto = Ax.math.bc.sub(
							mRowLiquidacionLinea.liql_importe_neto,
							mObjCuartoCubierto.importe
						)

						// Acumula diferencia de cuarto (#TEMPORAL# debe hacerse con el liq_impuesto)
						mObjLiquidacionImportes.liq_importe_dif_cuarto = Ax.math.bc.add(
							mObjLiquidacionImportes.liq_importe_dif_cuarto,
							mImporteDifCuarto
						)
					}

				}

			}

			/**
			 * CUENTA POR EXCESO DE CARTA DE GARANTÍA
			 * Si la cuenta que ha originado esta liquidación tiene el indicador de exceso
			 * de garantía, se aplica un coaseguro de 0% al financiador (100% al paciente)
			 * Tampoco aplica diferencia de cuarto ni de deducible.
			 */
			if (mObjLiquidacion.cnt_ind_exc_gar) {
				mFloatFactorCoa			= 0;
				mImporteDifCuarto		= null;
				mImporteDifDeducible	= null;
			}
		}

		// Se calcula el impuesto que aplica y el monto que paga (sin coaseguro, por el total valorado)
		let mFloatImpuestoVal = Ax.math.bc.mul(
			mRowLiquidacionLinea.liql_importe_neto,
			mRowLiquidacionLinea.imp_porcentaje
		);

		let mFloatImporteTot = Ax.math.bc.add(
			mRowLiquidacionLinea.liql_importe_neto,
			mFloatImpuestoVal
		);

		let mFloatImporteFac = Ax.math.bc.add(
			mRowLiquidacionLinea.liql_importe_neto,
			mFloatImpuestoVal
		);

		let mFloatImpuestoValCoa
		let mFloatImporteTotCoa
		let mFloatImporteNetCoa
		/**
		 * Se calcula el importe que corresponde pagar al financiador, su respectivo
		 * IGV, y el monto facturable (Total + IGV). Dichos valores se actualizan
		 * en la línea de la liquidación.
		 */
		if (mFloatFactorCoa != null ) {

			/**
			 * Si existe diferencia de cuarto, el importe neto para la valoración pasa a ser el importe
			 * del cuarto cubierto por la garantía
			 */
			if (mImporteDifCuarto != null) {
				mRowLiquidacionLinea.liql_importe_neto = mObjCuartoCubierto.importe;
			}

			/**
			 * Controlar si la linea de liquidacion corresponde a un importe de diferencia por deducible,
			 * de ser así el coaseguro no es sobre el importe neto de la valoración, sino el cálculado
			 * anteriormente.
			 */
			if (mImporteDifDeducible != null) {
				// La sustracción se realiza en este campo. Aún aplica la condición de existencia
				mRowLiquidacionLinea.liql_importe_neto = Ax.math.bc.sub(
					mRowLiquidacionLinea.liql_importe_neto,
					mImporteDifDeducible);
			}

			mFloatImporteNetCoa =  Ax.math.bc.mul(
				mRowLiquidacionLinea.liql_importe_neto,
				mFloatFactorCoa,
				0.01
			);

			mFloatImpuestoValCoa = Ax.math.bc.mul(
				mFloatImporteNetCoa,
				mRowLiquidacionLinea.imp_porcentaje
			);

			mFloatImporteTotCoa = Ax.math.bc.add(
				mFloatImporteNetCoa,
				mFloatImpuestoValCoa
			);

		} else {
			mFloatImporteNetCoa		= null;
			mFloatImpuestoValCoa	= null;
			mFloatImporteTotCoa		= null;
		}

		Ax.db.update("fas_liquidacion_linea",
			{
				"liql_factor_coa"			: mFloatFactorCoa,
				"liql_importe_total"		: mFloatImporteTot,
				"liql_impuesto_val"			: mFloatImpuestoVal,
				"liql_importe_fac"			: mFloatImporteFac,
				"liql_importe_dif_cuarto"	: mImporteDifCuarto,
				"liql_importe_neto_difd"	: mImporteDifDeducible ? mRowLiquidacionLinea.liql_importe_neto : null,
				"liql_importe_neto_coa"		: mFloatImporteNetCoa,
				"liql_impuesto_coa"			: mFloatImpuestoValCoa,
				"liql_importe_total_coa"	: mFloatImporteTotCoa,
				"user_updated"				: Ax.db.getUser(),
				"date_updated"				: new Ax.util.Date()
			},
			{
				"liql_id"					: mRowLiquidacionLinea.liql_id
			}
		);

		/**
		 * Se calculan los datos de la nueva linea de excedente ligada a la línea
		 * original, el factor Coa del Excedente es la diferencia porcentual de el
		 * original. El impuesto e importe facturable se calculan igualmente.
		 */
		let mCharEstado = 'P';

		if (mFloatFactorCoa != null) {

			mFloatFactorCoa		= Ax.math.bc.sub(100, mFloatFactorCoa);
			mFloatImporteNetCoa	= Ax.math.bc.mul(
				mRowLiquidacionLinea.liql_importe_neto,
				mFloatFactorCoa,
				0.01
			);

			mFloatImpuestoValCoa = Ax.math.bc.mul(
				mFloatImporteNetCoa,
				mRowLiquidacionLinea.imp_porcentaje
			);

			mFloatImporteTotCoa = Ax.math.bc.add(
				mFloatImporteNetCoa,
				mFloatImpuestoValCoa
			);

			mFloatImporteFac = mFloatImporteTotCoa;

		} else {
			mFloatImporteNetCoa  = null;
			mFloatImpuestoValCoa = null;
			mFloatImporteTotCoa  = null;
		}

		/**
		 * Generando objeto de líneas de pago paciente [Excedente]
		 * para posteriormente hacer push en el array
		 */
		let mObjLineasExcedente = {}

		// Guardar los datos en objeto y añadir al array
		mObjLineasExcedente.liql_id_principal	= mRowLiquidacionLinea.liql_id;		// Id de la liquidacion principal (financiador)
		mObjLineasExcedente.acp_id				= mRowLiquidacionLinea.acp_id;		// Id. de actividad de prestación
		mObjLineasExcedente.acd_id				= mRowLiquidacionLinea.acd_id;		// Id. de actividad de producto
		mObjLineasExcedente.FactorCoa			= mFloatFactorCoa;					// Factor coaseguro aplicado al pago paciente
		mObjLineasExcedente.ImporteNetCoa		= mFloatImporteNetCoa;				// Importe neto de coaseguro aplicado al pago paciente
		mObjLineasExcedente.ImpuestoValCoa		= mFloatImpuestoValCoa;				// Cuota de impuesto de coaseguro aplicado al pago paciente
		mObjLineasExcedente.ImporteTotCoa		= mFloatImporteTotCoa;				// Importe total de coaseguro aplicado al pago paciente
		mObjLineasExcedente.ImporteFac			= mFloatImporteFac;					// Importe total facturable para el pago paciente
		mObjLineasExcedente.Estado				= mCharEstado;						// Estado de la línea de liquidación de pago paciente

		mArrayExc.push(mObjLineasExcedente);

		/**
		 * Con que una línea tenga valor diferente de cero, se indica que
		 * genera Excedente
		 *
		 * A PETICION DE ELIZABETH DE CRP: SIEMPRE SE GENERA PAGO PACIENTE [EXCEDENTE]
		 */
		mExcedente = "S";

		// Se va acumulando el Coaseguro que está pagando el paciente (Excedente)
		mObjLiquidacionImportes.liq_importe_coa = Ax.math.bc.add(
			mObjLiquidacionImportes.liq_importe_coa,
			mFloatImporteNetCoa || 0
		);

		// Para los Pagos de paciente [Excedente], no se acumula coaseguro de consumos Farmacia
		if (!['9','RF'].includes(mRowLiquidacionLinea.liql_concep_fact)) {
			mFloatCoaExc = Ax.math.bc.add(
				mFloatCoaExc,
				mFloatImporteNetCoa || 0
			);
		}
	}

	// CÁLCULOS POST LINEAS

	/**
	 * Se asigna un deducible si el calificador de deducible es 'Consulta', existen honorarios, el
	 * deducible acumulado por consultas es 0 y no es Particular contado integral
	 * [PENDIENTE DEFINIR] EXCLUSION PARA AMBULATORIO
	 */

	if(mDeduAmbu){

		if ((mExistHonorario) && !mBoolNoCopago	&&
			mObjLiquidacion.cnt_ind_prevrs != 1	&&
			['VS','ZU','01'].includes(mObjAutorizacion.aut_calif_ded) &&
			Ax.math.bc.compareTo(mObjLiquidacionImportes.liq_importe_ded, new Ax.math.BigDecimal(0)) == 0) {

			mObjLiquidacionImportes.liq_importe_ded = Ax.math.bc.add(
				mObjLiquidacionImportes.liq_importe_ded,
				mObjAutorizacion.aut_importe_ded
			)
		}

	}else{

		if ((mExistHonorario) && !mBoolNoCopago	&&
			mObjLiquidacion.cnt_ind_prevrs != 1	&&
			['VS','ZU'].includes(mObjAutorizacion.aut_calif_ded) &&
			Ax.math.bc.compareTo(mObjLiquidacionImportes.liq_importe_ded, new Ax.math.BigDecimal(0)) == 0) {

			mObjLiquidacionImportes.liq_importe_ded = Ax.math.bc.add(
				mObjLiquidacionImportes.liq_importe_ded,
				mObjAutorizacion.aut_importe_ded
			)
		}

	}

	

	// Se actualizan datos económicos de cabecera
	mLiqImpTotal = __insertDatosEconomicos(pIDLiquidacion, mObjLiquidacionImportes);

	/**
	 * En caso de que corresponda, generamos la liquidación de Pago
	 * Paciente [Excedente] asociada con las correspondintes líneas.
	 * Es posible que no tenga líneas con valor pero si tenga deducible,
	 * en ese caso se genera tambien el excedente.
	 */
	if (mExcedente == "S" || Ax.math.bc.compareTo(mObjLiquidacionImportes.liq_importe_ded, 0) != 0 ) {

		/**
		 * Buscar una liquidación de Excedentes ligada a la liquidación principal
		 * En caso de no encontrarla, se genera una liquidación de Excedente nueva, si
		 * la encuentra recalcula los importes sobre la existente.
		 */
		let mIDLiquidacionExc = Ax.db.executeGet(`
			<select>
				<columns>
					fas_liquidacion.liq_id
				</columns>
				<from table='fas_liquidacion'>
					<join table='fas_liquidacion_tipo'>
						<on>fas_liquidacion.liq_tipo = fas_liquidacion_tipo.liqt_codigo</on>
					</join>
				</from>
				<where>
						fas_liquidacion.liq_id_ori = ?
					AND fas_liquidacion.liq_estado = 'A'
					AND fas_liquidacion_tipo.liqt_excedente = 1
				</where>
			</select>
		`, mObjLiquidacion.liq_id);

		if (!mIDLiquidacionExc) {

			mIDLiquidacionExc = Ax.db.insert("fas_liquidacion", {
				"liq_id"            : 0,
				"liq_id_ori"        : pIDLiquidacion,
				"liq_motivo"        : null,
				"liq_centro"        : mObjLiquidacion.liq_centro,
				"liq_ambito"        : mObjLiquidacion.liq_ambito,
				"liq_servicio"      : mObjLiquidacion.liq_servicio,
				"liq_numero"        : null,
				"liq_financiador"   : null,
				"liq_fecha"         : new Ax.sql.Date(),
				"liq_episodio"      : mObjLiquidacion.liq_episodio,
				"liq_estado"        : 'A',
				"liq_estdoc"        : mObjLiquidacion.liq_estdoc == 'G' ? 'G' : 'P',
				"liq_notas"         : null,
				"liq_tipo"          : mObjLiquidacion.liqt_tipoexc,

				"liq_cnt_id"        : mObjLiquidacion.liq_cnt_id,
				"liq_aut_id"        : mObjLiquidacion.liq_aut_id,
				"liq_gar_id"        : mObjLiquidacion.liq_gar_id,
				"liq_cg_id"         : mObjLiquidacion.liq_cg_id,
				"liq_divisa"        : mObjLiquidacion.emp_divisa,

				"user_created"      : Ax.ext.user.getCode(),
				"date_created"      : new Ax.util.Date().setConnection(Ax.db),
				"user_updated"      : Ax.ext.user.getCode(),
				"date_updated"      : new Ax.util.Date().setConnection(Ax.db)
			}).getSerial()

		} else {

			//  Actualiza datos relacionados a la autorización en el caso de que se hubiese modificado
			Ax.db.update("fas_liquidacion",
				{
					"liq_aut_id"    : mObjLiquidacion.liq_aut_id,
					"liq_gar_id"    : mObjLiquidacion.liq_gar_id,
					"liq_cg_id"     : mObjLiquidacion.liq_cg_id,
					"liq_divisa"    : mObjLiquidacion.liq_divisa,
					"liq_estdoc"    : mObjLiquidacion.liq_estdoc == 'G' ? 'G' : 'P'
				},
				{
					"liq_id"        : mIDLiquidacionExc
				}
			);
		}

		if (mObjLiquidacion.cnt_presta_paq &&
			mObjLiquidacion.cnt_tipo_fac == 'CHEMED') {

			let mLiqlIdChequeo = Ax.db.executeGet(`
				<select>
					<columns>
						liql_id
					</columns>
					<from table='fas_liquidacion_linea'>
						<join type='left' table='fas_impuesto'>
							<on>fas_liquidacion_linea.liql_impuesto=fas_impuesto.imp_codigo</on>
						</join>
					</from>
					<where>
							liq_id = ?
						AND acp_id = ?
					</where>
				</select>
			`, pIDLiquidacion, mObjLiquidacion.cnt_paq_acp_id);

			//	Linea Paquete Chequeo
			let mLineaChequeo = {
				"FactorCoa"				: 0,
				"ImporteNetCoa"			: 0,
				"ImpuestoValCoa"		: 0,
				"ImporteTotCoa"			: 0,
				"ImporteFac"			: 0,
				"Estado"				: 'X',
				"liql_id_principal"		: mLiqlIdChequeo,
				"acp_id"				: mObjLiquidacion.cnt_paq_acp_id
			}

			mArrayExc.push(mLineaChequeo);
		}

		// Recorrer array con las líneas del pago paciente [excedente]
		mArrayExc.forEach(row => {

			// Obtener datos de la línea de liquidación principal
			let mObjLiqLineaPrincipal = Ax.db.executeQuery(`
				<select>
					<columns>
						fas_liquidacion_linea.*
					</columns>
					<from table='fas_liquidacion_linea' />
					<where>
						fas_liquidacion_linea.liql_id = ?
					</where>
				</select>
			`, row.liql_id_principal).toOne();

			let mIDLiquidacionLineaExc
			/**
			 * Consulta si existe una linea para la actividad o producto seleccionada
			 * Si existe, se modifica, si no, se crea. Los datos son los mismos a la
			 * línea principal, a excepción de los importes facturables.
			 */
			if (row.acd_id) {

				mIDLiquidacionLineaExc = Ax.db.executeGet(`
					<select>
						<columns>
							liql_id
						</columns>
						<from table='fas_liquidacion_linea'/>
						<where>
							liq_id = ? AND
							acd_id = ?
						</where>
					</select>
				`, mIDLiquidacionExc, row.acd_id);

				if (['9','RF'].includes(mObjLiqLineaPrincipal.liql_concep_fact)) {
					row.estado = 'M';
				}

			} else {

				mIDLiquidacionLineaExc = Ax.db.executeGet(`
					<select>
						<columns>
							liql_id
						</columns>
						<from table='fas_liquidacion_linea'/>
						<where>
							liq_id = ? AND
							acp_id = ?
						</where>
					</select>
				`, mIDLiquidacionExc, row.acp_id);

			}

			if (mIDLiquidacionLineaExc) {

				Ax.db.update("fas_liquidacion_linea",
					{
						"liql_factor_coa"			: row.FactorCoa,
						"liql_cubierto"				: mObjLiqLineaPrincipal.liql_cubierto,
						"liql_cantidad"				: mObjLiqLineaPrincipal.liql_cantidad,
						"liql_precio_fac"			: mObjLiqLineaPrincipal.liql_precio_fac,
						"liql_descuento"			: mObjLiqLineaPrincipal.liql_descuento,
						"liql_importe_total"		: mObjLiqLineaPrincipal.liql_importe_total,
						"liql_impuesto_val"			: mObjLiqLineaPrincipal.liql_impuesto_val,
						"liql_importe_neto"			: mObjLiqLineaPrincipal.liql_importe_neto,
						"liql_importe_neto_difd"	: mObjLiqLineaPrincipal.liql_importe_neto_difd,
						"liql_importe_dif_cuarto"	: mObjLiqLineaPrincipal.liql_importe_dif_cuarto,
						"liql_importe_neto_coa"		: row.ImporteNetCoa,
						"liql_impuesto_coa"			: row.ImpuestoValCoa,
						"liql_importe_total_coa"	: row.ImporteTotCoa,
						"liql_importe_fac"			: row.ImporteFac,
						"liql_estado" 				: row.Estado,
						"user_updated"				: Ax.db.getUser(),
						"date_updated"				: new Ax.util.Date()
					},
					{
						"liql_id"					: mIDLiquidacionLineaExc
					}
				);

			} else {
				// Insertar línea de pago paciente
				mIDLiqExcLinea = Ax.db.insert("fas_liquidacion_linea", {
					"liql_id"					: 0,
					"liq_id"					: mIDLiquidacionExc,
					"liql_plan"					: mObjLiqLineaPrincipal.liql_plan,
					"liql_paciente"				: mObjLiqLineaPrincipal.liql_paciente,
					"liql_episodio"				: mObjLiqLineaPrincipal.liql_episodio,
					"liql_ambito"				: mObjLiqLineaPrincipal.liql_ambito,
					"liql_servicio"				: mObjLiqLineaPrincipal.liql_servicio,
					"acp_id"					: mObjLiqLineaPrincipal.acp_id,
					"acd_id"					: mObjLiqLineaPrincipal.acd_id,
					"liql_presta_fact"			: mObjLiqLineaPrincipal.liql_presta_fact,
					"liql_concep_fact"			: mObjLiqLineaPrincipal.liql_concep_fact,
					"liql_cubierto"				: mObjLiqLineaPrincipal.liql_cubierto,
					"liql_cantidad"				: mObjLiqLineaPrincipal.liql_cantidad,
					"liql_precio_fac"			: mObjLiqLineaPrincipal.liql_precio_fac,
					"liql_descuento"			: mObjLiqLineaPrincipal.liql_descuento,
					"liql_importe_neto"			: mObjLiqLineaPrincipal.liql_importe_neto,
					"liql_factor_coa"			: row.FactorCoa,
					"liql_impuesto"				: mObjLiqLineaPrincipal.liql_impuesto,
					"liql_impuesto_val"			: mObjLiqLineaPrincipal.liql_impuesto_val,
					"liql_importe_total"		: mObjLiqLineaPrincipal.liql_importe_total,
					"liql_importe_neto_difd"	: mObjLiqLineaPrincipal.liql_importe_neto_difd,
					"liql_importe_dif_cuarto"	: mObjLiqLineaPrincipal.liql_importe_dif_cuarto,
					"liql_importe_neto_coa"		: row.ImporteNetCoa,
					"liql_impuesto_coa"			: row.ImpuestoValCoa,
					"liql_importe_total_coa"	: row.ImporteTotCoa,
					"liql_autoriza"				: mObjLiqLineaPrincipal.liql_autoriza,
					"liql_importe_fac"			: row.ImporteFac,
					"liql_estado"				: row.Estado,
					"liql_motivo"				: mObjLiqLineaPrincipal.liql_motivo,
					"liql_notas"				: mObjLiqLineaPrincipal.liql_notas,
					"user_created"				: Ax.ext.user.getCode(),
					"date_created"				: new Ax.util.Date().setConnection(Ax.db),
					"user_updated"				: Ax.ext.user.getCode(),
					"date_updated"				: new Ax.util.Date().setConnection(Ax.db)
				}).getSerial()
			}
		});

		// Se actualizan datos económicos de cabecera
		mObjLiquidacionImportes.liq_importe_coa = mFloatCoaExc;

		__insertDatosEconomicos(mIDLiquidacionExc, mObjLiquidacionImportes);

		// RECÁLCULO DE IMPORTES PARA PAQUETES
		if (mObjLiquidacion.cnt_presta_paq) {
			let mBoolChequeo	= mObjLiquidacion.cnt_tipo_fac == 'CHEMED';
			let mLiqPaquete		= mBoolChequeo ? mIDLiquidacionExc : pIDLiquidacion;

			// CALCULAR DATOS DE PAQUETE
			let mRowPaquete = Ax.db.executeQuery(`
				<select>
					<columns>
						fas_liquidacion_linea.*,
						fas_impuesto.imp_porcentaje/100 imp_porcentaje
					</columns>
					<from table='fas_liquidacion_linea'>
						<join type='left' table='fas_impuesto'>
							<on>fas_liquidacion_linea.liql_impuesto=fas_impuesto.imp_codigo</on>
						</join>
					</from>
					<where>
							liq_id = ?
						AND acp_id = ?
					</where>
				</select>
			`, mLiqPaquete, mObjLiquidacion.cnt_paq_acp_id).toOne();

			// Recuperando importe de coaseguro para el paquete
			let mDescPaquete = Ax.db.executeGet(`
				<select>
					<columns>
						SUM(liql_importe_neto_coa)
					</columns>
					<from table='fas_liquidacion_linea'/>
					<where>
							liql_estado = 'P'
						AND liql_cubierto = 1
						AND liq_id = ?
						AND liql_impuesto = ?
					</where>
				</select>
			`, mIDLiquidacionExc, mRowPaquete.liql_impuesto);

			// Actualizando lineas incluidas en el paquete
			Ax.db.update("fas_liquidacion_linea",
					{
						"liql_estado"	: 'Q',
					},
					`
							liql_estado		= 'P'
						AND liql_cubierto	= 1
						AND liq_id			= ${mLiqPaquete}
						AND liql_impuesto	= '${mRowPaquete.liql_impuesto}'
					`
				);

			// Se calcula el impuesto que aplica y el monto que paga
			let mFloatImpuestVal = Ax.math.bc.mul(
				mRowPaquete.liql_importe_neto,
				mRowPaquete.imp_porcentaje
			);

			let mFloatImportTot = Ax.math.bc.add(
				mRowPaquete.liql_importe_neto,
				mFloatImpuestVal
			);

			let ImporteNetCoa = Ax.math.bc.sub(mRowPaquete.liql_importe_neto, mBoolChequeo ? 0 : mDescPaquete);
			let ImpuestoValCoa = Ax.math.bc.mul(ImporteNetCoa, mRowPaquete.imp_porcentaje);
			let ImporteTotCoa = Ax.math.bc.add(ImporteNetCoa, ImpuestoValCoa);

			// Actualizando la línea de paquete
			Ax.db.update("fas_liquidacion_linea",
					{
						"liql_factor_coa"			: null,
						"liql_impuesto_val"			: mFloatImpuestVal,
						"liql_importe_total"		: mFloatImportTot,
						"liql_importe_neto_coa"		: ImporteNetCoa,
						"liql_impuesto_coa"			: ImpuestoValCoa,
						"liql_importe_total_coa"	: ImporteTotCoa,
						"liql_importe_fac"			: mFloatImportTot,
						"liql_estado" 				: 'P',
						"user_updated"				: Ax.db.getUser(),
						"date_updated"				: new Ax.util.Date()
					},
					{
						"liql_id"					: mRowPaquete.liql_id
					}
				);

			// Se reacalculan los datos económicos con el paquete
			__insertDatosEconomicos(mLiqPaquete, mObjLiquidacionImportes);
		}
	}
	return mLiqImpTotal
}