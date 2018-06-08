const {models} = require('./model');
const Sequelize = require('sequelize');
const {log, biglog, errorlog, colorize} = require('./out');
const readline = require('readline');


exports.helpCmd = rl => {
		log("Comandos:");
		log("h|help - Muestra esta ayuda");
		log("List - Listar los quizzes existentes.");
		log("show <id> - Muestra la pregunta y la respuesta del quiz indicado");
		log("add - Añadir un nuevo quiz interactivamente");
		log("delete <id> - Borrar el quiz indicado");
		log("edit <id> - Editar el quiz indicado");
		log("test <id> - Probar el quiz indicado");
		log(" p|play - Jugar a preguntar aleatoriamente todos los quizzes");
		log("credits - Créditos");
		log("q|quit - Salir del programa");
		rl.prompt();
};

exports.addCmd = rl => {

		makeQuestion(rl, 'Introduzca una pregunta')
		.then(q => {
			return makeQuestion(rl, 'Introduzca la respuesta')
			.then(a =>{
				return {question: q, answer : a};
			});
		})
		.then( quiz => {
			return models.quiz.create(quiz);
		})
		.then((quiz)=> {
			log(`[${colorize('Se ha añadido','magenta')}]: ${quiz.question} ${colorize('=>','magenta')}${quiz.answer}`);
		})
		.catch(Sequelize.ValidationError, error =>{
			errorlog('El quiz es erroneo:');
			error.errors.forEach(({message})=> errorlog(message));
		})
		.catch(error=>{
			errorlog(error.message);
		})
		.then(() =>{
			rl.prompt();
		});
	};


exports.editCmd =(rl,id) => {
		if(typeof id === "undefined"){
			errorlog('Falta el parametro id');
			rl.prompt();
		} else {
			try{

				process.stdout.isTTY && setTimeout( () => {rl.write(id.question)},0);
				
				rl.question(colorize('Introduzca una pregunta:', 'red'), question => {
					
					process.stdout.isTTY && setTimeout( () => {rl.write(id.answer)},0);
					rl.question(colorize('Introduzca la respuesta', 'red'), answer => {

						model.update(id, question, answer);
						log(`[${colorize('Se ha añadido','magenta')}]: ${question} ${colorize('=>','magenta')}${answer}`);
						rl.prompt();
					})
				})
			}catch(error){
				errorlog(error.message);
				rl.prompt();
			}
		}
		rl.prompt();
};

exports.quitCmd = rl => {
		rl.close();
		rl.prompt();

};

exports.listCmd = rl => {
	models.quiz.findAll()
	.each(quiz => {
		log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
		})
	.catch(error=>{
		errorlog(error.message);
	})
	.then(()=> {
		rl.prompt();
	});
};


const validateId = id => {
	return new Sequelize.Promise((resolve, reject)=>{
		if(typeof id === "undefined"){
			reject(new Error(`Falta el parámetro <id>.`));
		}else{
			id = parseInt(id);
			if(Number.isNaN(id)){
				reject(new Error(`El valor del parametro <id> no es un numero.`));
			}else{
				resolve(id);
			}
		}
	});
};

exports.showCmd = (rl,id)  => {

		validateId(id)
		.then(id => models.quiz.findById(id))
		.then(quiz => {
			if(!quiz){
				throw new Error(`No existe un quiz asociado al id = ${id}`);
			}
			log(`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
		})
		.catch(error=> {
			errorlog(error.message);
		})
		.then(()=> {
			rl.prompt();
		});
	};


const makeQuestion = (rl, text)=> {
	return new Sequelize.Promise((resolve, reject)=> {
		rl.question(colorize(text,  'red'), answer =>{
			resolve(answer.trim());
		});
	});
};

exports.testCmd = (rl,id)  => {
		
		validateId(id)
		.then(id=> models.quiz.findById(id))
		.then(quiz=>{
			log(`Pregunta : ${quiz.question}`)
		return makeQuestion(rl, '¿Respuesta:')
		.then( a=> {
					if(a.toLowerCase().trim() === quiz.answer.toLowerCase()){
							log('Respuesta CORRECTA');
					} else {
							log('Respuesta INCORRECTA');
					}
				})
		})
		.catch(error=>{
				errorlog(error.message);
		})
		.then(()=>{
			rl.prompt();
		});

};

exports.playCmd = rl => {

		var puntos = 0;
		var toBeResolved = [];
		var Questions = 0;

	models.quiz.findAll()
		.each(quiz=>{
			Questions++;
			toBeResolved.length = Questions;
			toBeResolved.push(quiz.id);
			})
	 .then(()=>{
		if(Questions == 0 ){
			log('No quedan más preguntas','red');
		} else{
			playOne();
		}
	})
	.catch(error=>{
		errorlog(error.message);
	})
	.then(()=>{
		rl.prompt();
	});

		const playOne =()=> {
			var restantes =Questions - puntos;
			var id = Math.floor(Math.random()*(Questions-puntos));
			validateId(id);
			models.quiz.findById(toBeResolved[id])
			.then(quiz=> {
				log(`Pregunta: ${quiz.question}`);
				return makeQuestion(rl, '¿Respuesta?')
					.then(a=> {
						if(a.toLowerCase().trim()=== quiz.answer.toLowerCase()){
							puntos++;
							log(`CORRECTA, lleva ${puntos} puntos`,'green');
								if(puntos < Questions){
								toBeResolved.splice(id,1);
								models.quiz.findById(id)
								.then(()=>{
									rl.prompt();
								})
								.then(()=>{
									playOne();
								});
								} else{
									log('HAS GANADO');
								}
						}else{
							log('INCORRECTA');
							log(`Has acertado ${puntos} preguntas`);
						}
					})
			.catch(error =>{
				errorlog(error.message);
			});
		})
			.catch(error=>{
					errorlog(error.message);
			})

			.then(()=>{
				rl.prompt();
			});
		};	
};

exports.deleteCmd = (rl, id)  => {
	validateId(id)
	.then(id=> models.quiz.destroy({where: {id}}))
	.catch(error => {
		errorlog(error.message);
	})		
	.then(()=>{
		rl.prompt();
	});

};
exports.creditsCmd = rl => {
		log('Autores:');
		log('Natalia Garcia');
		log('Ignacio Arregui');
		rl.prompt();

};
