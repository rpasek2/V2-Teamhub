import { StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';

export const sharedStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEditBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.emerald[500],
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 12,
    marginBottom: 4,
  },
  emptyTextCenter: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyFieldText: {
    fontSize: 14,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
  // Edit form shared styles
  editFormSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[600],
    marginBottom: 6,
  },
  profileInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
    marginBottom: 10,
  },
  profileTextArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editFormButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[600],
  },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
  },
  editSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
