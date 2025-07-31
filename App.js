import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, Modal, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

// Cores do tema
const colors = {
  primary: '#5AC3E6',
  secondary: '#1DA5BE',
  accent: '#FF9A62',
  lightSand: '#F8F3E6',
  darkSand: '#E8DEC0',
  white: '#FFFFFF',
  textDark: '#2E2E2E'
};

// Chaves para o AsyncStorage
const INVENTORY_KEY = '@InventoryApp:inventory';
const SALES_KEY = '@InventoryApp:sales';

const App = () => {
  // Estados principais
  const [currentScreen, setCurrentScreen] = useState('menu');
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(null);
  const [editingSale, setEditingSale] = useState(null);

  // Estados para formulários
  const [newItem, setNewItem] = useState({
    id: null,
    name: '',
    category: '',
    price: '',
    quantity: '',
    photo: 'https://placehold.co/150x150/?text=Item+Photo'
  });

  const [newSale, setNewSale] = useState({
    id: null,
    date: new Date().toISOString().split('T')[0],
    items: [],
    total: 0
  });

  // Estados para busca/filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedDateRange, setSelectedDateRange] = useState('daily');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      try {
        const [inventoryData, salesData] = await Promise.all([
          AsyncStorage.getItem(INVENTORY_KEY),
          AsyncStorage.getItem(SALES_KEY)
        ]);

        setInventory(inventoryData ? JSON.parse(inventoryData) : []);
        setSales(salesData ? JSON.parse(salesData) : []);
        setIsLoading(false);
      } catch (error) {
        Alert.alert('Erro', 'Falha ao carregar dados');
        console.error(error);
      }
    };

    loadData();
  }, []);

  // Filtros
  useEffect(() => {
    setFilteredItems(
      inventory.filter(item =>
        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        item.category.toLowerCase().includes(itemSearch.toLowerCase())
      )
    );
  }, [itemSearch, inventory]);

  // Funções de persistência
  const saveInventory = async (data) => {
    try {
      await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(data));
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar estoque');
      console.error(error);
    }
  };

  const saveSales = async (data) => {
    try {
      await AsyncStorage.setItem(SALES_KEY, JSON.stringify(data));
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar vendas');
      console.error(error);
    }
  };

  // Funções de estoque
  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category || !newItem.price || !newItem.quantity) {
      Alert.alert('Atenção', 'Preencha todos os campos');
      return;
    }

    const newId = newItem.id || (inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) + 1 : 1);
    const updatedInventory = [
      ...inventory.filter(item => item.id !== newItem.id),
      {
        ...newItem,
        id: newId,
        price: parseFloat(newItem.price),
        quantity: parseInt(newItem.quantity)
      }
    ];

    setInventory(updatedInventory);
    await saveInventory(updatedInventory);

    setNewItem({
      id: null,
      name: '',
      category: '',
      price: '',
      quantity: '',
      photo: 'https://placehold.co/150x150/?text=Item+Photo'
    });

    Alert.alert('Sucesso', 'Item salvo com sucesso!');
  };

  const handleEditItem = (item) => {
    setNewItem(item);
  };

  const handleDeleteItem = async (id) => {
    const updatedInventory = inventory.filter(item => item.id !== id);
    setInventory(updatedInventory);
    await saveInventory(updatedInventory);
    Alert.alert('Sucesso', 'Item removido!');
  };

  // Funções de vendas
  const handleAddToSale = (item) => {
    if (item.quantity <= 0) {
      Alert.alert('Atenção', 'Item sem estoque disponível');
      return;
    }

    setNewSale(prev => ({
      ...prev,
      items: [...prev.items, { ...item, quantity: 1 }],
      total: prev.total + item.price
    }));
    setModalVisible(null);
  };

  const handleUpdateSaleItem = (index, change) => {
    const newQuantity = newSale.items[index].quantity + change;
    if (newQuantity < 1) return;

    const updatedItems = [...newSale.items];
    const originalItem = inventory.find(i => i.id === updatedItems[index].id);

    if (originalItem && (newQuantity - updatedItems[index].quantity) > originalItem.quantity) {
      Alert.alert('Atenção', 'Quantidade insuficiente em estoque');
      return;
    }

    updatedItems[index].quantity = newQuantity;

    setNewSale(prev => ({
      ...prev,
      items: updatedItems,
      total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }));
  };

  const handleCompleteSale = async () => {
    if (newSale.items.length === 0) {
      Alert.alert('Atenção', 'Adicione itens à venda');
      return;
    }

    const updatedInventory = inventory.map(item => {
      const soldItem = newSale.items.find(si => si.id === item.id);
      if (soldItem) {
        return {
          ...item,
          quantity: item.quantity - soldItem.quantity
        };
      }
      return item;
    });

    const newId = editingSale?.id || (sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 1 : 1);
    const updatedSales = editingSale
      ? sales.map(sale => sale.id === editingSale.id ? { ...newSale, id: newId } : sale)
      : [...sales, { ...newSale, id: newId }];

    setInventory(updatedInventory);
    setSales(updatedSales);
    await saveInventory(updatedInventory);
    await saveSales(updatedSales);

    setNewSale({
      id: null,
      date: new Date().toISOString().split('T')[0],
      items: [],
      total: 0
    });
    setEditingSale(null);

    Alert.alert('Sucesso', `Venda ${editingSale ? 'atualizada' : 'registrada'}!`);
  };

  const handleEditSale = (sale) => {
    // Restaura itens ao estoque antes de editar
    const updatedInventory = inventory.map(item => {
      const soldItem = sale.items.find(si => si.id === item.id);
      return soldItem
        ? { ...item, quantity: item.quantity + soldItem.quantity }
        : item;
    });

    setInventory(updatedInventory);
    setNewSale({
      id: sale.id,
      date: sale.date,
      items: [...sale.items],
      total: sale.total
    });
    setEditingSale(sale);
  };

  const handleDeleteSale = async (id) => {
    const saleToDelete = sales.find(s => s.id === id);

    // Restaura itens ao estoque
    const updatedInventory = inventory.map(item => {
      const soldItem = saleToDelete.items.find(si => si.id === item.id);
      return soldItem
        ? { ...item, quantity: item.quantity + soldItem.quantity }
        : item;
    });

    const updatedSales = sales.filter(sale => sale.id !== id);

    setInventory(updatedInventory);
    setSales(updatedSales);
    await saveInventory(updatedInventory);
    await saveSales(updatedSales);

    Alert.alert('Sucesso', 'Venda excluída!');
  };

  // Funções para o dashboard
  const getFilteredSales = () => {
    try {
      const filterDateObj = new Date(filterDate);

      return sales.filter(sale => {
        try {
          // Garante que a data da venda é válida
          const saleDate = sale.date ? new Date(sale.date) : new Date();

          if (selectedDateRange === 'daily') {
            // Compara apenas a data no formato YYYY-MM-DD
            return sale.date === filterDate;
          } else if (selectedDateRange === 'monthly') {
            return saleDate.getFullYear() === filterDateObj.getFullYear() &&
                   saleDate.getMonth() === filterDateObj.getMonth();
          } else { // yearly
            return saleDate.getFullYear() === filterDateObj.getFullYear();
          }
        } catch (e) {
          console.error('Erro ao processar venda:', sale, e);
          return false; // Ignora vendas com datas inválidas
        }
      });
    } catch (e) {
      console.error('Erro ao filtrar vendas:', e);
      return []; // Retorna array vazio em caso de erro
    }
  };


  const getSalesData = () => {
    const filtered = getFilteredSales();

    const salesByDate = {};

    filtered.forEach(sale => {
      try {
        const saleDate = sale.date ? new Date(sale.date) : new Date();
        let dateKey;

        if (selectedDateRange === 'daily') {
          dateKey = sale.date.split('T')[0]; // Pega apenas a parte da data (YYYY-MM-DD)
        } else if (selectedDateRange === 'monthly') {
          dateKey = `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}`;
        } else { // yearly
          dateKey = saleDate.getFullYear().toString();
        }

        salesByDate[dateKey] = (salesByDate[dateKey] || 0) + sale.total;
      } catch (e) {
        console.error('Erro ao processar venda para gráfico:', sale, e);
      }
    });

    // Garante que sempre retorne pelo menos um valor
    if (Object.keys(salesByDate).length === 0) {
      return {
        labels: ['Nenhum dado'],
        data: [0]
      };
    }

    return {
      labels: Object.keys(salesByDate),
      data: Object.values(salesByDate),
    };
  };


  const getTopSellingProducts = () => {
    const productSales = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.quantity;
      });
    });

    return Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  };

  const getInventoryStatus = () => {
    return [...inventory].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  };

  // Renderização das telas
  const renderMenu = () => (
    <LinearGradient colors={[colors.lightSand, colors.white]} style={styles.screen}>
      <Text style={styles.title}>Gestão de Vendas e Estoque</Text>
      <Text style={styles.title}>Luê Brand.</Text>

      <TouchableOpacity style={styles.menuButton} onPress={() => setCurrentScreen('inventory')}>
        <Text style={styles.menuButtonText}>Controle de Estoque</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={() => setCurrentScreen('sales')}>
        <Text style={styles.menuButtonText}>Controle de Vendas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={() => setCurrentScreen('dashboard')}>
        <Text style={styles.menuButtonText}>Dashboard</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderInventory = () => (
    <LinearGradient colors={[colors.lightSand, colors.white]} style={styles.screen}>
      <Text style={styles.title}>Controle de Estoque</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nome da Peça"
          value={newItem.name}
          onChangeText={text => setNewItem({...newItem, name: text})}
        />

        <TextInput
          style={styles.input}
          placeholder="Categoria"
          value={newItem.category}
          onChangeText={text => setNewItem({...newItem, category: text})}
        />

        <TextInput
          style={styles.input}
          placeholder="Valor"
          value={newItem.price}
          onChangeText={text => setNewItem({...newItem, price: text})}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Quantidade"
          value={newItem.quantity}
          onChangeText={text => setNewItem({...newItem, quantity: text})}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.buttonText}>{newItem.id ? 'Atualizar Item' : 'Adicionar ao Estoque'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {inventory.map(item => (
          <View key={item.id} style={styles.itemCard}>
            <Image source={{ uri: item.photo }} style={styles.itemImage} />
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
              <Text style={styles.itemPrice}>R$ {item.price.toFixed(2)}</Text>
              <Text style={styles.itemQuantity}>Estoque: {item.quantity}</Text>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => handleEditItem(item)}>
                <Text style={styles.actionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteItem(item.id)}>
                <Text style={styles.actionText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {inventory.length === 0 && (
          <Text style={styles.emptyMessage}>Nenhum item no estoque</Text>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
        <Text style={styles.buttonText}>Voltar ao Menu</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderSales = () => (
    <LinearGradient colors={[colors.lightSand, colors.white]} style={styles.screen}>
      <Text style={styles.title}>Controle de Vendas</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Data (AAAA-MM-DD)"
          value={newSale.date}
          onChangeText={text => setNewSale({...newSale, date: text})}
        />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setModalVisible('salesList')}
        >
          <Text style={styles.buttonText}>Ver Histórico de Vendas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible('itemSearch')}
        >
          <Text style={styles.buttonText}>Adicionar Item</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {newSale.items.map((item, index) => (
          <View key={index} style={styles.saleItemCard}>
            <Image source={{ uri: item.photo || 'https://placehold.co/80x80/?text=Item' }} style={styles.saleItemImage} />

            <View style={styles.saleItemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>R$ {item.price.toFixed(2)} cada</Text>

              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateSaleItem(index, -1)}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.quantityText}>{item.quantity}</Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleUpdateSaleItem(index, 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotal}>Total: R$ {(item.price * item.quantity).toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                const updatedItems = [...newSale.items];
                updatedItems.splice(index, 1);
                setNewSale({
                  ...newSale,
                  items: updatedItems,
                  total: updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                });
              }}
            >
              <Text style={styles.removeButtonText}>X</Text>
            </TouchableOpacity>
          </View>
        ))}

        {newSale.items.length === 0 && (
          <Text style={styles.emptyMessage}>Nenhum item adicionado à venda</Text>
        )}
      </ScrollView>

      {newSale.items.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total da Venda: R$ {newSale.total.toFixed(2)}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.completeButton, newSale.items.length === 0 && styles.disabledButton]}
        onPress={handleCompleteSale}
        disabled={newSale.items.length === 0}
      >
        <Text style={styles.buttonText}>{editingSale ? 'Atualizar Venda' : 'Finalizar Venda'}</Text>
      </TouchableOpacity>

      {editingSale && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            // Restaura itens ao estoque
            const updatedInventory = inventory.map(item => {
              const soldItem = newSale.items.find(si => si.id === item.id);
              return soldItem
                ? { ...item, quantity: item.quantity + soldItem.quantity }
                : item;
            });
            setInventory(updatedInventory);

            setNewSale({
              date: new Date().toISOString().split('T')[0],
              items: [],
              total: 0
            });
            setEditingSale(null);
          }}
        >
          <Text style={styles.cancelButtonText}>Cancelar Edição</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
        <Text style={styles.buttonText}>Voltar ao Menu</Text>
      </TouchableOpacity>

      {/* Modal de histórico de vendas */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible === 'salesList'}
        onRequestClose={() => setModalVisible(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Histórico de Vendas</Text>

            <ScrollView style={styles.modalContent}>
              {sales.map(sale => (
                <View key={sale.id} style={styles.saleCard}>
                  <View style={styles.saleHeader}>
                    <Text style={styles.saleDate}>{sale.date}</Text>
                    <Text style={styles.saleTotal}>R$ {sale.total.toFixed(2)}</Text>
                  </View>

                  <View style={styles.saleItemsList}>
                    {sale.items.map((item, i) => (
                      <View key={i} style={styles.saleItemRow}>
                        <Text>
                          {item.name} ({item.quantity} x R$ {item.price.toFixed(2)})
                        </Text>
                        <Text style={styles.saleItemTotal}>
                          R$ {(item.quantity * item.price).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.saleActions}>
                    <TouchableOpacity
                      style={styles.editSaleButton}
                      onPress={() => {
                        setModalVisible(null);
                        handleEditSale(sale);
                      }}
                    >
                      <Text style={styles.editSaleButtonText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteSaleButton}
                      onPress={() => handleDeleteSale(sale.id)}
                    >
                      <Text style={styles.deleteSaleButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {sales.length === 0 && (
                <Text style={styles.emptyMessage}>Nenhuma venda registrada</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(null)}
            >
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de seleção de itens */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible === 'itemSearch'}
        onRequestClose={() => setModalVisible(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecionar Item do Estoque</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar..."
              value={itemSearch}
              onChangeText={setItemSearch}
            />

            <ScrollView style={styles.modalList}>
              {filteredItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.modalItem}
                  onPress={() => handleAddToSale(item)}
                  disabled={item.quantity <= 0}
                >
                  <Image source={{ uri: item.photo }} style={styles.modalItemImage} />
                  <View style={styles.modalItemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemPrice}>R$ {item.price.toFixed(2)}</Text>
                    <Text style={item.quantity <= 0 ? styles.outOfStock : styles.itemQuantity}>
                      Estoque: {item.quantity}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {filteredItems.length === 0 && (
                <Text style={styles.emptyMessage}>Nenhum item encontrado</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(null)}
            >
              <Text style={styles.buttonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );

  const renderDashboard = () => {
    if (isLoading) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Carregando dados...</Text>
        </View>
      );
    }

    const salesData = getSalesData();
    const topProducts = getTopSellingProducts();
    const inventoryStatus = getInventoryStatus();

    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Dashboard Analítico</Text>

        <View style={styles.filterControls}>
          <Picker
            selectedValue={selectedDateRange}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedDateRange(itemValue)}
          >
            <Picker.Item label="Diário" value="daily" />
            <Picker.Item label="Mensal" value="monthly" />
            <Picker.Item label="Anual" value="yearly" />
          </Picker>

          <TextInput
            style={styles.dateInput}
            value={filterDate}
            onChangeText={setFilterDate}
            placeholder="AAAA-MM-DD"
          />
        </View>

        <ScrollView>
          {sales.length > 0 ? (
            <>
              <Text style={styles.chartTitle}>Vendas ao Longo do Tempo (R$)</Text>
              <LineChart
                data={{
                  labels: salesData.labels || [], // Garante que será um array
                  datasets: [{ data: salesData.data || [] }] // Garante que será um array
                }}
                width={Dimensions.get('window').width - 40}
                height={220}
                yAxisLabel="R$ "
                chartConfig={chartConfig}
                bezier
                style={styles.chartStyle}
              />
            </>
          ) : (
            <Text style={styles.emptyMessage}>Nenhuma venda registrada</Text>
          )}

          {topProducts.length > 0 && sales.length > 0 && (
            <>
              <Text style={styles.chartTitle}>Produtos Mais Vendidos</Text>
              <BarChart
                data={{
                  labels: topProducts.map(p => p[0]),
                  datasets: [{ data: topProducts.map(p => p[1]) }]
                }}
                width={Dimensions.get('window').width - 40}
                height={220}
                yAxisLabel=""
                chartConfig={chartConfig}
                style={styles.chartStyle}
              />
            </>
          )}

          {inventory.length > 0 && (
            <>
              <Text style={styles.chartTitle}>Estoque Atual</Text>
              <PieChart
                data={inventoryStatus.map(item => ({
                  name: item.name.substring(0, 12) + (item.name.length > 12 ? '...' : ''),
                  population: item.quantity,
                  color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12
                }))}
                width={Dimensions.get('window').width - 40}
                height={180}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={styles.chartStyle}
              />
            </>
          )}

          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Resumo de Vendas</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total de Vendas:</Text>
              <Text style={styles.statValue}>{getFilteredSales().length}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Valor Total:</Text>
              <Text style={styles.statValue}>
                R$ {getFilteredSales().reduce((total, sale) => total + sale.total, 0).toFixed(2)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Itens Vendidos:</Text>
              <Text style={styles.statValue}>
                {getFilteredSales().reduce((total, sale) =>
                  total + sale.items.reduce((sum, item) => sum + item.quantity, 0), 0)}
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Resumo de Estoque</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total de Itens:</Text>
              <Text style={styles.statValue}>{inventory.length}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Itens em Estoque:</Text>
              <Text style={styles.statValue}>
                {inventory.reduce((total, item) => total + item.quantity, 0)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Valor Total do Estoque:</Text>
              <Text style={styles.statValue}>
                R$ {inventory.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('menu')}>
          <Text style={styles.buttonText}>Voltar ao Menu</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {currentScreen === 'menu' && renderMenu()}
      {currentScreen === 'inventory' && renderInventory()}
      {currentScreen === 'sales' && renderSales()}
      {currentScreen === 'dashboard' && renderDashboard()}
    </View>
  );
};

// Configuração dos gráficos
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#007aff'
  }
};

// Estilos
const styles = StyleSheet.create({
  // [Todos os estilos anteriores permanecem os mesmos]
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  screen: {
    flex: 1,
    padding: 20,
    paddingBottom: 80,
   justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  form: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  menuButton: {
    backgroundColor: '#5AC3E6',
    padding: 15,
    borderRadius: 50,
    marginBottom: 15,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#34c759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  secondaryButton: {
    backgroundColor: '#1DA5BE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  completeButton: {
    backgroundColor: '#5856d6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  cancelButton: {
    backgroundColor: '#ff9500',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  backButton: {
    backgroundColor: '#ff9500',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  menuButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
    marginBottom: 60,
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  itemActions: {
    flexDirection: 'column',
  },
  editBtn: {
    backgroundColor: '#5AC3E6',
    padding: 5,
    borderRadius: 5,
    marginBottom: 5,
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    padding: 5,
    borderRadius: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemCategory: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007aff',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  outOfStock: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  saleItemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  saleItemDetails: {
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  quantityButton: {
    backgroundColor: '#f2f2f7',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007aff',
  },
  quantityText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34c759',
  },
  removeButton: {
    backgroundColor: '#ff3b30',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5856d6',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  modalContent: {
    padding: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    textAlign: 'center',
  },
  modalList: {
    padding: 10,
  },
  modalItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  modalItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  modalItemDetails: {
    flex: 1,
  },
  modalCloseButton: {
    backgroundColor: '#ff9500',
    padding: 12,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  saleDate: {
    fontWeight: 'bold',
  },
  saleTotal: {
    fontWeight: 'bold',
    color: '#1DA5BE',
  },
  saleItemsList: {
    marginLeft: 10,
    marginTop: 5,
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  saleItemTotal: {
    fontWeight: '600',
  },
  saleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editSaleButton: {
    backgroundColor: '#5AC3E6',
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  deleteSaleButton: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  editSaleButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  deleteSaleButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  filterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  picker: {
    flex: 1,
    height: 50,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  dateInput: {
    flex: 1,
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'center',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'white',
    padding: 10,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007aff',
  },
});

export default App;
