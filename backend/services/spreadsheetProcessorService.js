import xlsx from 'xlsx';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Expense, Category, SubCategory, Bank } from '../models/index.js';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

class SpreadsheetProcessorService {
  constructor() {
    this.categories = [];
    this.subcategories = [];
    this.banks = [];
    this.defaultCategory = null;
    this.defaultSubCategory = null;
    this.defaultBank = null;
  }

  async initialize() {
    try {
      // Carrega todas as categorias, subcategorias e bancos
      this.categories = await Category.findAll();
      this.subcategories = await SubCategory.findAll();
      this.banks = await Bank.findAll();

      // Define os valores padrão
      this.defaultCategory = await Category.findOne({ where: { category_name: 'Outros' } });
      this.defaultSubCategory = await SubCategory.findOne({ where: { subcategory_name: 'Outros' } });
      this.defaultBank = await Bank.findOne({ where: { name: 'Outro' } });

      if (!this.defaultCategory || !this.defaultSubCategory || !this.defaultBank) {
        throw new Error('Categorias, subcategorias ou bancos padrão não encontrados');
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      throw error;
    }
  }

  async processSpreadsheet(filePath, userId) {
    try {
      await this.initialize();

      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      const processedData = [];
      
      for (const row of data) {
        const description = Object.values(row).join(' ');
        const { categoryId, subcategoryId } = await this.categorizeExpense(description);
        
        // Tenta encontrar valores monetários nas colunas
        const amount = this.findMonetaryValue(row);
        
        if (amount) {
          processedData.push({
            description: description,
            amount: amount,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            bank_id: this.defaultBank.id,
            user_id: userId,
            date: this.findDate(row) || new Date(),
            type: amount > 0 ? 'income' : 'expense'
          });
        }
      }

      await this.saveToDatabase(processedData);
      return processedData;
    } catch (error) {
      console.error('Erro ao processar planilha:', error);
      throw error;
    }
  }

  async categorizeExpense(description) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Cria lista de categorias para o prompt
      const categoryList = this.categories.map(cat => cat.category_name).join(', ');
      
      const prompt = `Categorize a seguinte despesa/ganho em uma das categorias: 
      ${categoryList}
      
      Despesa/Ganho: "${description}"
      
      Responda apenas com o nome da categoria, sem pontuação ou texto adicional.
      Mas antes, faça uma sanitização dos dados, removendo caracteres especiais e espaços em branco.
      Lembre-se que a planilha pode não está pradronizada, ou seja, terão planiljas que os itens estãrão
      organizados por colunas, e não por linhas e vice-versa.
      Tente achar padrões de parcelas, como por exemplo:
      - "Parcela 1 de 3"
      - "Parcela 2 de 3"
      - "Parcela 3 de 3"
      - "Parcela 1 de 2"
      - "Parcela 2 de 2", ou padrões assim:
      - "1/3"
      - "2/3"
      - "3/3"
      - "1/2"
      - "2/2",
      e crie a despesa como parcelada.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const categoryName = response.text().trim();

      // Encontra a categoria no banco de dados
      let category = this.categories.find(c => c.category_name.toLowerCase() === categoryName.toLowerCase());
      if (!category) {
        category = this.defaultCategory;
      }

      // Agora vamos categorizar a subcategoria
      const subcategoriesForCategory = this.subcategories.filter(sub => sub.category_id === category.id);
      const subcategoryList = subcategoriesForCategory.map(sub => sub.subcategory_name).join(', ');

      const subcategoryPrompt = `Agora, para a categoria "${category.category_name}", escolha uma subcategoria entre:
      ${subcategoryList}
      
      Despesa/Ganho: "${description}"
      
      Responda apenas com o nome da subcategoria, sem pontuação ou texto adicional.`;

      const subcategoryResult = await model.generateContent(subcategoryPrompt);
      const subcategoryResponse = await subcategoryResult.response;
      const subcategoryName = subcategoryResponse.text().trim();

      // Encontra a subcategoria no banco de dados
      let subcategory = subcategoriesForCategory.find(s => s.subcategory_name.toLowerCase() === subcategoryName.toLowerCase());
      if (!subcategory) {
        subcategory = this.defaultSubCategory;
      }

      return {
        categoryId: category.id,
        subcategoryId: subcategory.id
      };
    } catch (error) {
      console.error('Erro ao categorizar despesa:', error);
      return {
        categoryId: this.defaultCategory.id,
        subcategoryId: this.defaultSubCategory.id
      };
    }
  }

  findMonetaryValue(row) {
    for (const key in row) {
      const value = row[key];
      if (typeof value === 'number') {
        return value;
      }
      if (typeof value === 'string') {
        // Remove caracteres especiais e converte para número
        const cleanValue = value.replace(/[^0-9,-]/g, '').replace(',', '.');
        const number = parseFloat(cleanValue);
        if (!isNaN(number)) {
          return number;
        }
      }
    }
    return null;
  }

  findDate(row) {
    for (const key in row) {
      const value = row[key];
      if (value instanceof Date) {
        return value;
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return null;
  }

  async saveToDatabase(processedData) {
    try {
      for (const item of processedData) {
        await Expense.create(item);
      }
    } catch (error) {
      console.error('Erro ao salvar no banco de dados:', error);
      throw error;
    }
  }
}

export default new SpreadsheetProcessorService(); 